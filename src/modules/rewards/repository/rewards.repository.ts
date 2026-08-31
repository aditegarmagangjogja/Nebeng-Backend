import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RewardType } from '../../../generated/prisma/enums';

@Injectable()
export class RewardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async findUserById(userIdStr: string) {
    const parsedUserId = this.safeParseBigInt(userIdStr);
    if (!parsedUserId) return null;

    return this.prisma.user.findUnique({
      where: { id: parsedUserId },
      select: {
        id: true,
        name: true,
        email: true,
        rewardPoints: true,
        regionId: true,
        status: true,
      },
    });
  }

  async addRewardPoints(data: {
    userIdStr: string;
    points: number;
    description?: string;
  }) {
    const parsedUserId = this.safeParseBigInt(data.userIdStr);
    if (!parsedUserId) {
      throw new BadRequestException('Format ID User tidak valid');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: parsedUserId },
        data: {
          rewardPoints: { increment: data.points },
        },
      });

      const transaction = await tx.rewardTransaction.create({
        data: {
          userId: parsedUserId,
          points: data.points,
          type: RewardType.earn,
          description: data.description,
        },
        include: { user: true },
      });

      return { user: updatedUser, transaction };
    });
  }

  async deductRewardPoints(data: {
    userIdStr: string;
    points: number;
    description?: string;
  }) {
    const parsedUserId = this.safeParseBigInt(data.userIdStr);
    if (!parsedUserId) {
      throw new BadRequestException('Format ID User tidak valid');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: {
          id: parsedUserId,
          rewardPoints: { gte: data.points },
        },
        data: {
          rewardPoints: { decrement: data.points },
        },
      });

      if (!updatedUser) {
        throw new BadRequestException(
          'Saldo poin tidak mencukupi atau terjadi kesalahan transaksi.',
        );
      }

      const transaction = await tx.rewardTransaction.create({
        data: {
          userId: parsedUserId,
          points: data.points,
          type: RewardType.redeem,
          description: data.description,
        },
        include: { user: true },
      });

      return { user: updatedUser, transaction };
    });
  }

  async getRewardHistoryByUserId(userIdStr: string) {
    const parsedUserId = this.safeParseBigInt(userIdStr);
    if (!parsedUserId) return [];

    return this.prisma.rewardTransaction.findMany({
      where: { userId: parsedUserId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
