import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TransactionType } from '../../../generated/prisma/enums';

@Injectable()
export class WalletsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async findByUserId(userId: string) {
    const parsedId = this.safeParseBigInt(userId);
    if (!parsedId) return null;

    return this.prisma.wallet.findUnique({
      where: { userId: parsedId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }

  async createWallets(userId: string) {
    const parsedId = this.safeParseBigInt(userId);
    if (!parsedId) {
      throw new BadRequestException('Format ID user tidak valid');
    }

    return this.prisma.wallet.create({
      data: {
        userId: parsedId,
        balance: 0.0,
        heldEscrowBalance: 0.0,
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }

  async processEscrowHold(
    walletId: bigint,
    orderIdStr: string,
    amount: number,
  ) {
    const parseOrderId = this.safeParseBigInt(orderIdStr);
    if (!parseOrderId) {
      throw new BadRequestException('Format ID Order tidak valid');
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { id: walletId },
        data: {
          heldEscrowBalance: { increment: amount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId,
          orderId: parseOrderId,
          amount,
          type: TransactionType.escrow_hold,
          description: `Escrow hold untuk order ${orderIdStr}`,
        },
      });

      return wallet;
    });
  }

  async processEscrowRelease(
    walletId: bigint,
    orderIdStr: string,
    amount: number,
  ) {
    const parseOrderId = this.safeParseBigInt(orderIdStr);
    if (!parseOrderId) {
      throw new BadRequestException('Format ID order tidak valid');
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { id: walletId },
        data: {
          heldEscrowBalance: { decrement: amount },
          balance: { increment: amount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId,
          orderId: parseOrderId,
          amount,
          type: TransactionType.escrow_release,
          description: `Pencairan dana Escrow untuk order #${orderIdStr}`,
        },
      });

      return wallet;
    });
  }
}
