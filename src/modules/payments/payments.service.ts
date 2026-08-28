import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsRepository } from './repository/payments.repository';
import { OrdersRepository } from '../orders/repository/orders.repository';
import { WalletsService } from '../wallets/wallets.service';
import { CheckoutPaymentDto } from './dto/checkout-payment.dto';
import { OrderStatus } from '../../generated/prisma/enums';
import { randomBytes } from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly walletsService: WalletsService,
  ) {}

  async checkoutPayment(userIdStr: string, dto: CheckoutPaymentDto) {
    // 1. Fetch Order menggunakan string ID (Fixes TS2345 error)
    const order = await this.ordersRepository.findById(dto.orderId);

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    if (order.customerId.toString() !== userIdStr) {
      throw new BadRequestException('Order ini bukan milik anda.');
    }

    if (order.status !== OrderStatus.pending_payment) {
      throw new BadRequestException(
        'Order ini tidak dalam status menunggu pembayaran',
      );
    }

    const transactionId = `TRX-${randomBytes(4).toString('hex').toUpperCase()}`;
    const amount = Number(order.totalPrice);

    const { payment, order: updatedOrder } =
      await this.paymentsRepository.createPaymentAndUpdateOrder(
        dto.orderId,
        dto.paymentGateway,
        transactionId,
        amount,
      );

    const mitraUserId = updatedOrder.trip.mitraId.toString();
    await this.walletsService.holdEscrow(mitraUserId, dto.orderId, amount);

    return {
      message:
        'Pembayaran berhasil dikonfirmasi dan dana telah ditahan oleh Escrow System.',
      payment: {
        id: payment.id.toString(),
        transactionId: payment.transactionId,
        amount: Number(payment.amount),
        status: payment.status,
      },
    };
  }
}
