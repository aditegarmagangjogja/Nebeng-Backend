import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  EscrowStatus,
  OrderStatus,
  PaymentStatus,
  TransactionType,
} from '../../../generated/prisma/enums';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async processCheckoutTransaction(
    orderIdStr: string,
    mitraUserIdStr: string,
    paymentGateway: string,
    transactionId: string,
    amount: number,
  ) {
    const parsedOrderId = this.safeParseBigInt(orderIdStr);
    const parsedMitraId = this.safeParseBigInt(mitraUserIdStr);

    if (!parsedOrderId || !parsedMitraId) {
      throw new BadRequestException('Format ID Order atau Mitra tidak valid');
    }

    return this.prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: parsedOrderId },
        select: { id: true, status: true },
      });

      if (
        !currentOrder ||
        currentOrder.status !== OrderStatus.pending_payment
      ) {
        throw new BadRequestException(
          'Order sudah dibayar, dibatalkan, atau tidak valid untuk pembayaran.',
        );
      }

      const payment = await tx.payment.create({
        data: {
          orderId: parsedOrderId,
          paymentGateway,
          transactionId,
          amount,
          status: PaymentStatus.success,
        },
      });

      const order = await tx.order.update({
        where: { id: parsedOrderId },
        data: {
          status: OrderStatus.paid,
          escrowStatus: EscrowStatus.held,
        },
        include: {
          trip: true,
        },
      });

      let wallet = await tx.wallet.findUnique({
        where: { userId: parsedMitraId },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: parsedMitraId,
            balance: 0,
            heldEscrowBalance: 0,
          },
        });
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          heldEscrowBalance: { increment: amount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: updatedWallet.id,
          orderId: parsedOrderId,
          amount,
          type: TransactionType.escrow_hold,
          description: `Dana ditahan Escrow untuk Order #${orderIdStr}`,
        },
      });

      return { payment, order };
    });
  }

  async getPaymentsByOperator(operatorUserIdStr: string) {
    const parsedOperatorId = this.safeParseBigInt(operatorUserIdStr);
    if (!parsedOperatorId) {
      throw new BadRequestException('Format ID Operator tidak valid');
    }

    // Mencari pembayaran dari trip yang berasal dari PickupPoint yang dikelola operator ini
    return this.prisma.payment.findMany({
      where: {
        order: {
          trip: {
            originPoint: {
              operatorId: parsedOperatorId,
            },
          },
        },
      },
      include: {
        order: {
          include: {
            customer: true,
            trip: {
              include: {
                originPoint: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
