import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UserStatus,
  TransactionType,
  OrderStatus,
  TripStatus,
  VerificationStatus,
  ServiceType,
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
    const defaultPricing = await this.prisma.pricingSetting.findFirst({
      select: { adminFeePercentage: true },
    });
    const commissionRate = defaultPricing
      ? Number(defaultPricing.adminFeePercentage) / 100
      : 0.1;

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
              OrderStatus.arrived_destination,
            ],
          },
        },
        _sum: { totalPrice: true },
      }),
      this.prisma.trip.count({
        where: {
          status: {
            in: [
              TripStatus.scheduled,
              TripStatus.in_transit,
              TripStatus.in_origin_pos,
            ],
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
    const platformCommission = totalRevenue * commissionRate;

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
          status: { in: [TripStatus.completed, TripStatus.arrived_dest_pos] },
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

  async getRewardSetting() {
    const setting = await this.prisma.pricingSetting.findFirst({
      where: { serviceType: ServiceType.barang },
      select: { farePerKg: true },
    });
    return setting?.farePerKg ? Number(setting.farePerKg) : 10000;
  }

  async updateRewardSetting(pointsMultiplier: number) {
    const serviceTypes = [
      ServiceType.motor,
      ServiceType.mobil,
      ServiceType.barang,
    ];

    const updatePromises = serviceTypes.map(async (serviceType) => {
      const existing = await this.prisma.pricingSetting.findFirst({
        where: { serviceType },
      });

      if (existing) {
        return this.prisma.pricingSetting.update({
          where: { id: existing.id },
          data: { farePerKg: pointsMultiplier },
        });
      }

      return this.prisma.pricingSetting.create({
        data: {
          serviceType,
          baseFare: 5000,
          farePerKm: 3000,
          farePerKg: pointsMultiplier,
          adminFeePercentage: 10,
        },
      });
    });

    await Promise.all(updatePromises);
    return pointsMultiplier;
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

  async updateRegionPriceRate(regionIdStr: string, pricePerKm: number) {
    const parsedRegionId = this.safeParseBigInt(regionIdStr);
    if (!parsedRegionId) {
      throw new BadRequestException(
        'Format ID Wilayah (Region ID) tidak valid',
      );
    }

    const region = await this.prisma.region.findUnique({
      where: { id: parsedRegionId },
    });

    if (!region) return null;

    return this.prisma.region.update({
      where: { id: parsedRegionId },
      data: { pricePerKm },
    });
  }

  async updatePlatformCommissionRate(percentage: number) {
    const serviceTypes = [
      ServiceType.motor,
      ServiceType.mobil,
      ServiceType.barang,
    ];

    const updatePromises = serviceTypes.map(async (serviceType) => {
      const existing = await this.prisma.pricingSetting.findFirst({
        where: { serviceType },
      });

      if (existing) {
        return this.prisma.pricingSetting.update({
          where: { id: existing.id },
          data: { adminFeePercentage: percentage },
        });
      }

      return this.prisma.pricingSetting.create({
        data: {
          serviceType,
          baseFare: 5000,
          farePerKm: 3000,
          adminFeePercentage: percentage,
        },
      });
    });

    await Promise.all(updatePromises);
    return percentage;
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
