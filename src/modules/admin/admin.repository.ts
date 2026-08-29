import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UserStatus,
  TransactionType,
  OrderStatus,
  TripStatus,
  VerificationStatus,
} from '../../generated/prisma/enums';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async getGlobalAnalytics() {
    const [
      totalPaidOrders,
      activeTripsCount,
      totalTransactionsCount,
      regionalSummary,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          status: {
            in: [
              OrderStatus.paid,
              OrderStatus.completed,
              OrderStatus.in_transit,
            ],
          },
        },
        _sum: { totalPrice: true },
      }),
      this.prisma.trip.count({
        where: {
          status: {
            in: [TripStatus.scheduled, TripStatus.in_transit],
          },
        },
      }),
      this.prisma.order.count(),
      this.prisma.region.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              pickupPoints: true,
              users: true,
            },
          },
        },
      }),
    ]);

    const totalRevenue = Number(totalPaidOrders._sum.totalPrice || 0);
    const platformCommission = totalRevenue * 0.1; // Komisi 10% platform

    return {
      totalRevenue,
      platformCommission,
      activeTripsCount,
      totalTransactionsCount,
      regionalSummary,
    };
  }

  async getRegionalAnalytics(regionIdStr: string) {
    const parsedRegionId = this.safeParseBigInt(regionIdStr);
    if (!parsedRegionId) {
      throw new BadRequestException(
        'Format ID Wilayah (Region ID) tidak valid',
      );
    }

    const region = await this.prisma.region.findUnique({
      where: { id: parsedRegionId },
    });

    const [
      activePosCount,
      departedTripsCount,
      arrivedTripsCount,
      pendingVerificationsCount,
    ] = await Promise.all([
      this.prisma.pickupPoint.count({
        where: { regionId: parsedRegionId, isActive: true },
      }),
      this.prisma.trip.count({
        where: {
          originPoint: { regionId: parsedRegionId },
          status: {
            in: [TripStatus.in_transit, TripStatus.completed],
          },
        },
      }),
      this.prisma.trip.count({
        where: {
          destinationPoint: { regionId: parsedRegionId },
          status: { in: [TripStatus.completed] },
        },
      }),
      this.prisma.verification.count({
        where: {
          user: { regionId: parsedRegionId },
          status: VerificationStatus.pending,
        },
      }),
    ]);

    return {
      regionName: region ? region.name : 'Unknown Region',
      activePosCount,
      departedTripsCount,
      arrivedTripsCount,
      pendingVerificationsCount,
    };
  }

  async getEscrowLedger() {
    const [heldAggregate, releasedAggregate, recentTransactions] =
      await Promise.all([
        this.prisma.wallet.aggregate({
          _sum: { heldEscrowBalance: true },
        }),
        this.prisma.walletTransaction.aggregate({
          where: { type: TransactionType.escrow_release },
          _sum: { amount: true },
        }),
        this.prisma.walletTransaction.findMany({
          where: {
            type: {
              in: [TransactionType.escrow_hold, TransactionType.escrow_release],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);

    return {
      totalHeldEscrow: Number(heldAggregate._sum.heldEscrowBalance || 0),
      totalReleasedEscrow: Number(releasedAggregate._sum.amount || 0),
      recentTransactions,
    };
  }

  async updateUserStatus(userIdStr: string, status: UserStatus) {
    const parsedUserId = this.safeParseBigInt(userIdStr);
    if (!parsedUserId) {
      throw new BadRequestException('Format ID User tidak valid');
    }

    return this.prisma.user.update({
      where: { id: parsedUserId },
      data: { status },
    });
  }

  async findUserById(userIdStr: string) {
    const parsedUserId = this.safeParseBigInt(userIdStr);
    if (!parsedUserId) return null;

    return this.prisma.user.findUnique({
      where: { id: parsedUserId },
    });
  }
}
