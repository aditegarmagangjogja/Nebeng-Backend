import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  EscrowStatus,
  OrderStatus,
  PaymentStatus,
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

  async createPaymentAndUpdateOrder(
    orderIdStr: string,
    paymentGateway: string,
    transactionId: string,
    amount: number,
  ) {
    const parsedOrderId = this.safeParseBigInt(orderIdStr);
    if (!parsedOrderId) {
      throw new BadRequestException('Format ID Order tidak valid');
    }

    return this.prisma.$transaction(async (tx) => {
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

      return { payment, order };
    });
  }
}
