import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  EscrowStatus,
  OrderStatus,
  RewardType,
  Role,
  ScanType,
  ServiceType,
  TransactionType,
  TripStatus,
} from '../../../generated/prisma/enums';

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
  ) {
    const parsedPosId = this.safeParseBigInt(posIdStr);
    const parsedUserId = this.safeParseBigInt(scannedByUserIdStr);

    if (!parsedPosId || !parsedUserId) {
      throw new BadRequestException('Format ID Pos atau ID User tidak valid');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.trip.update({
        where: { id: tripId },
        data: { status: TripStatus.in_transit },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.checked_in_origin },
      });

      if (securitySealQr) {
        await tx.itemOrder.updateMany({
          where: { orderId },
          data: { securitySealQr },
        });
      }

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
          heldEscrowBalance: { decrement: totalPrice },
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

      const superadmin = await tx.user.findFirst({
        where: { role: Role.superadmin },
      });

      if (superadmin) {
        let superadminWallet = await tx.wallet.findUnique({
          where: { userId: superadmin.id },
        });

        if (!superadminWallet) {
          superadminWallet = await tx.wallet.create({
            data: { userId: superadmin.id, balance: 0, heldEscrowBalance: 0 },
          });
        }

        await tx.wallet.update({
          where: { id: superadminWallet.id },
          data: { balance: { increment: platformFee } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: superadminWallet.id,
            orderId,
            amount: platformFee,
            type: TransactionType.credit,
            description: `Pendapatan komisi platform ${adminFeePercentage}% dari order #${orderId}`,
          },
        });
      }

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
          heldEscrowBalance: { decrement: totalPrice },
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

      const superadmin = await tx.user.findFirst({
        where: { role: Role.superadmin },
      });

      if (superadmin) {
        let superadminWallet = await tx.wallet.findUnique({
          where: { userId: superadmin.id },
        });

        if (!superadminWallet) {
          superadminWallet = await tx.wallet.create({
            data: { userId: superadmin.id, balance: 0, heldEscrowBalance: 0 },
          });
        }

        await tx.wallet.update({
          where: { id: superadminWallet.id },
          data: { balance: { increment: platformFee } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: superadminWallet.id,
            orderId,
            amount: platformFee,
            type: TransactionType.credit,
            description: `Komisi platform ${adminFeePercentage}% (Manual Operator Pos) dari order #${orderId}`,
          },
        });
      }

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
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.cancelled,
          escrowStatus: EscrowStatus.refunded,
        },
      });

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
