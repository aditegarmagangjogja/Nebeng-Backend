import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentsRepository } from './repository/payments.repository';
import { OrdersRepository } from '../orders/repository/orders.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutPaymentDto } from './dto/checkout-payment.dto';
import { OrderStatus, Role, ServiceType } from '../../generated/prisma/enums';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly prisma: PrismaService,
  ) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async checkoutPayment(userIdStr: string, dto: CheckoutPaymentDto) {
    const parsedUserId = this.safeParseBigInt(userIdStr);
    if (!parsedUserId) {
      throw new BadRequestException('ID User tidak valid.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: parsedUserId },
    });

    if (!user) {
      throw new NotFoundException('Data pengguna tidak ditemukan.');
    }

    if (!user.pinHash) {
      throw new BadRequestException(
        'Anda belum mengatur PIN Transaksi. Silakan buat PIN terlebih dahulu pada menu pengaturan akun.',
      );
    }

    const isPinValid = await bcrypt.compare(dto.pin, user.pinHash);
    if (!isPinValid) {
      throw new UnauthorizedException(
        'PIN transaksi yang Anda masukkan salah.',
      );
    }

    const order = await this.ordersRepository.findById(dto.orderId);

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan.');
    }

    if (order.customerId.toString() !== userIdStr) {
      throw new BadRequestException('Order ini bukan milik Anda.');
    }

    if (order.status !== OrderStatus.pending_payment) {
      throw new BadRequestException(
        'Order ini tidak dalam status menunggu pembayaran.',
      );
    }

    const transactionId = `TRX-${randomBytes(4).toString('hex').toUpperCase()}`;
    const totalPrice = Number(order.totalPrice);

    let adminFeePercentage = order.adminFeePercentage
      ? Number(order.adminFeePercentage)
      : 10;

    if (!order.adminFeePercentage) {
      const serviceType =
        order.type === 'passenger'
          ? order.trip.vehicleType === 'motor'
            ? ServiceType.motor
            : ServiceType.mobil
          : ServiceType.barang;

      const pricingSetting = await this.prisma.pricingSetting.findFirst({
        where: { serviceType },
      });

      if (pricingSetting?.adminFeePercentage) {
        adminFeePercentage = Number(pricingSetting.adminFeePercentage);
      }
    }

    // Perhitungan finansial presisi dengan pembulatan Math.round
    const adminFeeAmount = Math.round((totalPrice * adminFeePercentage) / 100);
    const netMitraAmount = totalPrice - adminFeeAmount;

    const mitraUserId = order.trip.mitraId.toString();

    const { payment } =
      await this.paymentsRepository.processCheckoutTransaction(
        dto.orderId,
        mitraUserId,
        dto.paymentGateway,
        transactionId,
        totalPrice,
        adminFeeAmount,
        netMitraAmount,
      );

    return {
      message:
        'Pembayaran berhasil dikonfirmasi dan dana telah ditahan oleh Escrow System.',
      payment: {
        id: payment.id.toString(),
        transactionId: payment.transactionId,
        amount: Number(payment.amount),
        adminFeeAmount,
        netMitraAmount,
        status: payment.status,
      },
    };
  }

  async getPaymentsByRegion(currentUser: any, regionId?: string) {
    let parsedRegionId: bigint | null = null;

    if (currentUser.role === Role.regional) {
      if (!currentUser.regionId) {
        throw new ForbiddenException(
          'Akun Regional Admin ini belum dihubungkan dengan ID Wilayah manapun.',
        );
      }
      parsedRegionId = this.safeParseBigInt(currentUser.regionId.toString());
    } else if (regionId) {
      parsedRegionId = this.safeParseBigInt(regionId);
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        order: {
          trip: {
            originPoint: {
              ...(parsedRegionId ? { regionId: parsedRegionId } : {}),
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
                originPoint: { include: { region: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => ({
      ...p,
      id: p.id.toString(),
      orderId: p.orderId.toString(),
      amount: Number(p.amount),
    }));
  }

  async getPaymentsByOperator(operatorUserIdStr: string) {
    const payments =
      await this.paymentsRepository.getPaymentsByOperator(operatorUserIdStr);

    return payments.map((p) => ({
      ...p,
      id: p.id.toString(),
      orderId: p.orderId.toString(),
      amount: Number(p.amount),
    }));
  }
}
