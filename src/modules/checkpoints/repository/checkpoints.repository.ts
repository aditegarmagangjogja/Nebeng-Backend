import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  EscrowStatus,
  OrderStatus,
  RewardType,
  ScanType,
  ServiceType,
  TransactionType,
  TripStatus,
} from '../../../generated/prisma/enums';
import { randomBytes } from 'crypto';

@Injectable()
export class CheckpointsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async findTripByQr(qrCodeTrip: string) {
    return this.prisma.trip.findUnique({
      where: { qrCodeTrip },
      include: { originPoint: true, destinationPoint: true },
    });
  }

  async findOrderByQr(qrCodeTicket: string) {
    return this.prisma.order.findUnique({
      where: { qrCodeTicket },
      include: { itemOrders: true },
    });
  }

  async processCheckinOrigin(
    tripId: bigint,
    orderId: bigint,
    posIdStr: string,
    scannedByUserIdStr: string,
    securitySealQr?: string,
    photoUrl?: string,
  ) {
    const parsedPosId = this.safeParseBigInt(posIdStr);
    const parsedUserId = this.safeParseBigInt(scannedByUserIdStr);
    if (!parsedPosId || !parsedUserId) {
      throw new BadRequestException('Format ID Pos atau ID User tidak valid');
    }
    // Buat kode tiket baru yang unik khusus fase Pos Tujuan
    const nextDestQrToken = `TKT-DEST-${randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date();
    const tokenExpiry = new Date(now.getTime() + 48 * 60 * 60 * 1000); // Aktif 48 jam
    return this.prisma.$transaction(async (tx) => {
      // 1. Update status trip menjadi in_transit
      await tx.trip.update({
        where: { id: tripId },
        data: { status: TripStatus.in_transit },
      });
      // 2. Hanguskan sesi QR sebelumnya (Pos Asal)
      await tx.orderQrSession.updateMany({
        where: { orderId, isUsed: false },
        data: { isUsed: true, usedAt: now },
      });
      // 3. Buat sesi QR baru untuk Pos Tujuan
      await tx.orderQrSession.create({
        data: {
          orderId,
          qrToken: nextDestQrToken,
          scanPhase: ScanType.checkin_destination,
          isUsed: false,
          expiredAt: tokenExpiry,
        },
      });
      // 4. Update order dengan kode QR tujuan baru & status in_transit
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.checked_in_origin,
          qrCodeTicket: nextDestQrToken, // Rotasi QR tiket
        },
      });
      // 5. Simpan segel fisik jika pengiriman paket barang
      if (securitySealQr || photoUrl) {
        await tx.itemOrder.updateMany({
          where: { orderId },
          data: {
            ...(securitySealQr && { securitySealQr }),
            ...(photoUrl && { photoUrl }),
          },
        });
      }
      // 6. Catat riwayat log checkpoint
      return tx.checkpointsLog.create({
        data: {
          tripId,
          orderId,
          posId: parsedPosId,
          scannedByUserId: parsedUserId,
          scanType: ScanType.checkin_origin,
        },
        include: { trip: true, order: true, pos: true },
      });
    });
  }

  async processCheckinDestinationAndReleaseEscrow(
    tripId: bigint,
    orderId: bigint,
    posIdStr: string,
    scannedByUserIdStr: string,
    mitraUserId: bigint,
    customerId: bigint,
    totalPrice: number,
    adminFeePercentage: number = 10,
    recipientName?: string,
  ) {
    const parsedPosId = this.safeParseBigInt(posIdStr);
    const parsedUserId = this.safeParseBigInt(scannedByUserIdStr);

    if (!parsedUserId || !parsedPosId) {
      throw new BadRequestException('Format ID Pos atau ID User tidak valid');
    }

    return this.prisma.$transaction(async (tx) => {
      const platformFee = totalPrice * (adminFeePercentage / 100);
      const mitraEarnings = totalPrice - platformFee;

      await tx.trip.update({
        where: { id: tripId },
        data: { status: TripStatus.completed },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.completed,
          escrowStatus: EscrowStatus.released,
        },
      });

      if (recipientName) {
        await tx.itemOrder.updateMany({
          where: { orderId },
          data: { recipientName },
        });
      }

      let mitraWallet = await tx.wallet.findUnique({
        where: { userId: mitraUserId },
      });

      if (!mitraWallet) {
        mitraWallet = await tx.wallet.create({
          data: { userId: mitraUserId, balance: 0, heldEscrowBalance: 0 },
        });
      }

      await tx.wallet.update({
        where: { id: mitraWallet.id },
        data: {
          heldEscrowBalance: { decrement: mitraEarnings },
          balance: { increment: mitraEarnings },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: mitraWallet.id,
          orderId,
          amount: mitraEarnings,
          type: TransactionType.escrow_release,
          description: `Pencairan dana Escrow order #${orderId} (setelah dipotong komisi platform ${adminFeePercentage}%)`,
        },
      });

      // Admin fee is already credited at checkout in payments.repository.ts

      const rewardSetting = await tx.pricingSetting.findFirst({
        where: { serviceType: ServiceType.barang },
        select: { farePerKg: true },
      });

      const multiplier =
        rewardSetting?.farePerKg && Number(rewardSetting.farePerKg) > 0
          ? Number(rewardSetting.farePerKg)
          : 10000;

      const earnedPoints = Math.max(1, Math.floor(totalPrice / multiplier));

      await tx.user.update({
        where: { id: customerId },
        data: { rewardPoints: { increment: earnedPoints } },
      });

      await tx.rewardTransaction.create({
        data: {
          userId: customerId,
          points: earnedPoints,
          type: RewardType.earn,
          description: `Reward ${earnedPoints} poin (Rasio kelipatan Rp ${multiplier.toLocaleString()}) atas penyelesaian order #${orderId}`,
        },
      });

      return tx.checkpointsLog.create({
        data: {
          tripId,
          orderId,
          posId: parsedPosId,
          scannedByUserId: parsedUserId,
          scanType: ScanType.checkin_destination,
        },
        include: { trip: true, order: true, pos: true },
      });
    });
  }

  async processManualForceCompleteAndRelease(
    tripId: bigint,
    orderId: bigint,
    posIdStr: string,
    scannedByUserIdStr: string,
    mitraUserId: bigint,
    customerId: bigint,
    totalPrice: number,
    adminFeePercentage: number = 10,
  ) {
    const parsedPosId = this.safeParseBigInt(posIdStr);
    const parsedUserId = this.safeParseBigInt(scannedByUserIdStr);

    if (!parsedUserId || !parsedPosId) {
      throw new BadRequestException('Format ID Pos atau ID User tidak valid');
    }

    return this.prisma.$transaction(async (tx) => {
      const platformFee = totalPrice * (adminFeePercentage / 100);
      const mitraEarnings = totalPrice - platformFee;

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.completed,
          escrowStatus: EscrowStatus.released,
        },
      });

      let mitraWallet = await tx.wallet.findUnique({
        where: { userId: mitraUserId },
      });

      if (!mitraWallet) {
        mitraWallet = await tx.wallet.create({
          data: { userId: mitraUserId, balance: 0, heldEscrowBalance: 0 },
        });
      }

      await tx.wallet.update({
        where: { id: mitraWallet.id },
        data: {
          heldEscrowBalance: { decrement: mitraEarnings },
          balance: { increment: mitraEarnings },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: mitraWallet.id,
          orderId,
          amount: mitraEarnings,
          type: TransactionType.escrow_release,
          description: `Force Release Escrow (Manual Operator Pos) order #${orderId} (setelah komisi ${adminFeePercentage}%)`,
        },
      });

      // Admin fee is already credited at checkout in payments.repository.ts

      return tx.checkpointsLog.create({
        data: {
          tripId,
          orderId,
          posId: parsedPosId,
          scannedByUserId: parsedUserId,
          scanType: ScanType.checkin_destination,
        },
        include: { trip: true, order: true, pos: true },
      });
    });
  }

  async processOperatorCancelOrder(
    orderId: bigint,
    tripId: bigint,
    seatsToRestore: number,
    weightToRestore: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Dapatkan informasi Order untuk kalkulasi refund
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { trip: true },
      });

      if (!order) {
        throw new BadRequestException('Order tidak ditemukan');
      }

      // 2. Process Refund jika order sudah dibayar
      if (
        order.status === 'paid' ||
        order.status === 'checked_in_origin' ||
        order.escrowStatus === 'held'
      ) {
        const totalPrice = Number(order.totalPrice);
        const adminFeePercentage = Number(order.adminFeePercentage || 10);
        const adminFeeAmount = Math.round((totalPrice * adminFeePercentage) / 100);
        const netMitraAmount = totalPrice - adminFeeAmount;

        // a. Refund Customer
        let customerWallet = await tx.wallet.findUnique({
          where: { userId: order.customerId },
        });
        if (!customerWallet) {
          customerWallet = await tx.wallet.create({
            data: { userId: order.customerId, balance: 0, heldEscrowBalance: 0 },
          });
        }
        await tx.wallet.update({
          where: { id: customerWallet.id },
          data: { balance: { increment: totalPrice } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: customerWallet.id,
            orderId: order.id,
            amount: totalPrice,
            type: TransactionType.credit,
            description: `Refund Order Dibatalkan Operator #${order.id}`,
          },
        });

        // b. Deduct Escrow from Mitra
        const mitraWallet = await tx.wallet.findUnique({
          where: { userId: order.trip.mitraId },
        });
        if (mitraWallet) {
          await tx.wallet.update({
            where: { id: mitraWallet.id },
            data: { heldEscrowBalance: { decrement: netMitraAmount } },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: mitraWallet.id,
              orderId: order.id,
              amount: netMitraAmount,
              type: TransactionType.debit,
              description: `Pengembalian Dana Escrow (Order Dibatalkan) #${order.id}`,
            },
          });
        }

        // c. Deduct Admin Fee from System Admin
        const systemAdminIdEnv = process.env.SYSTEM_ADMIN_USER_ID;
        const parsedSystemAdminId = systemAdminIdEnv
          ? BigInt(systemAdminIdEnv)
          : null;
        const adminUser = parsedSystemAdminId
          ? await tx.user.findUnique({ where: { id: parsedSystemAdminId } })
          : await tx.user.findFirst({
              where: { role: 'admin' },
              orderBy: { id: 'asc' },
            });

        if (adminUser) {
          const adminWallet = await tx.wallet.findUnique({
            where: { userId: adminUser.id },
          });
          if (adminWallet) {
            await tx.wallet.update({
              where: { id: adminWallet.id },
              data: { balance: { decrement: adminFeeAmount } },
            });
            await tx.walletTransaction.create({
              data: {
                walletId: adminWallet.id,
                orderId: order.id,
                amount: adminFeeAmount,
                type: TransactionType.debit,
                description: `Pengembalian Admin Fee (Order Dibatalkan) #${order.id}`,
              },
            });
          }
        }
      }

      // 3. Update Order Status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.cancelled,
          escrowStatus: EscrowStatus.refunded,
        },
      });

      // 4. Kembalikan Kuota
      await tx.trip.update({
        where: { id: tripId },
        data: {
          seatAvailable: { increment: seatsToRestore },
          remainingWeightCapacityKg: { increment: weightToRestore },
        },
      });

      return updatedOrder;
    });
  }
}
