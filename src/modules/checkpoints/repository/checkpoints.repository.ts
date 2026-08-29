import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  EscrowStatus,
  OrderStatus,
  ScanType,
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
      throw new BadRequestException('Format ID Pos atau Id user tidak valid');
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
    posId: string,
    scannedByUserId: string,
    mitraUserId: bigint,
    totalPrice: number,
  ) {
    const parsedPosId = this.safeParseBigInt(posId);
    const parseUserId = this.safeParseBigInt(scannedByUserId);

    if (!parseUserId || !parsedPosId) {
      throw new BadRequestException('Format id Pos atau id user tidak valid');
    }

    return this.prisma.$transaction(async (tx) => {
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

      const log = await tx.checkpointsLog.create({
        data: {
          tripId,
          orderId,
          posId: parsedPosId,
          scannedByUserId: parseUserId,
          scanType: ScanType.checkin_destination,
        },
        include: { trip: true, order: true, pos: true },
      });

      const wallet = await tx.wallet.findUnique({
        where: { userId: mitraUserId },
      });

      if (wallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            heldEscrowBalance: { decrement: totalPrice },
            balance: { increment: totalPrice },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            orderId,
            amount: totalPrice,
            type: TransactionType.escrow_release,
            description: `Pencairan dana Escrow release untuk order ${orderId}`,
          },
        });
      }

      return log;
    });
  }
}
