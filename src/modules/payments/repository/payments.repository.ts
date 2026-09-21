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

<<<<<<< Updated upstream
      let wallet = await tx.wallet.findUnique({
=======
      let mitraWallet = await tx.wallet.findUnique({
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
      const systemAdminIdEnv = process.env.SYSTEM_ADMIN_USER_ID;
      const parsedSystemAdminId = systemAdminIdEnv
        ? this.safeParseBigInt(systemAdminIdEnv)
        : null;

      const adminUser = parsedSystemAdminId
        ? await tx.user.findUnique({ where: { id: parsedSystemAdminId } })
        : await tx.user.findFirst({
            where: { role: 'admin' },
            orderBy: { id: 'asc' },
          });

      if (adminUser) {
        let adminWallet = await tx.wallet.findUnique({
          where: { userId: adminUser.id },
        });

        if (!adminWallet) {
          adminWallet = await tx.wallet.create({
            data: { userId: adminUser.id, balance: 0, heldEscrowBalance: 0 },
          });
        }

        await tx.wallet.update({
          where: { id: adminWallet.id },
          data: { balance: { increment: adminFeeAmount } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: adminWallet.id,
            orderId: parsedOrderId,
            amount: adminFeeAmount,
            type: TransactionType.credit,
            description: `Pendapatan Admin Fee Order #${orderIdStr}`,
          },
        });
      }

>>>>>>> Stashed changes
      return { payment, order };
    });
  }

  async getPaymentsByOperator(operatorUserIdStr: string) {
    const parsedOperatorId = this.safeParseBigInt(operatorUserIdStr);
    if (!parsedOperatorId) {
      throw new BadRequestException('Format ID Operator tidak valid');
    }

<<<<<<< Updated upstream
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
=======
    const assignedPos = await this.prisma.pickupPoint.findFirst({
      where: { operatorId: parsedOperatorId },
    });

    const skip = (page - 1) * limit;

    const whereCondition = {
      order: {
        trip: {
          originPoint: {
            operatorId: parsedOperatorId,
          },
        },
      },
    };

    const [payments, totalItems] = await Promise.all([
      this.prisma.payment.findMany({
        where: whereCondition,
        skip,
        take: limit,
        include: {
          order: {
            include: {
              customer: true,
              trip: {
                include: {
                  originPoint: true,
                },
>>>>>>> Stashed changes
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
