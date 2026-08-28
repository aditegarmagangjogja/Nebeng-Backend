import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrdersRepository } from './repository/orders.repository';
import { TripsRepository } from '../trips/repository/trips.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderMapper } from './mappers/order.mapper';
import { OrderType, TripStatus } from '../../generated/prisma/enums';
import { randomBytes, randomInt } from 'crypto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly tripsRepository: TripsRepository,
  ) {}

  private async generateUniqueTicketQr(): Promise<string> {
    let qrCodeTiket = '';
    let isUnique = false;

    while (!isUnique) {
      const hex = randomBytes(4).toString('hex').toUpperCase();
      qrCodeTiket = `TKT-${hex}`;
      const existing = await this.ordersRepository.findByTicketQr(qrCodeTiket);
      if (!existing) {
        isUnique = true;
      }
    }

    return qrCodeTiket;
  }

  private generateOtp(): string {
    return randomInt(100000, 999999).toString();
  }

  async createOrder(customerIdStr: string, dto: CreateOrderDto) {
    const trip = await this.tripsRepository.findById(dto.tripId);
    if (!trip) {
      throw new NotFoundException('Jadwal Trip tidak ditemukan.');
    }

    if (trip.mitraId.toString() === customerIdStr) {
      throw new BadRequestException(
        'Anda tidak dapat memesan tiket pada jadwal trip milik anda sendiri',
      );
    }

    if (trip.status !== TripStatus.scheduled) {
      throw new BadRequestException(
        'Trip ini sudah tidak menerima pemesanan baru.',
      );
    }

    let seatsBooked = 0;
    let totalItemsCount = 0;
    let totalWeightKg = 0;
    let totalPrice = 0;
    let otpClaim: string | null = null;
    const itemsDataProcessed: any[] = [];

    if (dto.type === OrderType.passenger) {
      seatsBooked = dto.seatsBooked ?? 1;

      if (trip.seatAvailable < seatsBooked) {
        throw new BadRequestException(
          `Sisa kursi tidak mencukupi. Tersedia: ${trip.seatAvailable}, Diminta: ${seatsBooked}`,
        );
      }

      totalPrice = Number(trip.price) * seatsBooked;
    }

    if (dto.type === OrderType.parcel) {
      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException(
          'Item barang wajib diisi untuk pemesanan jenis Parcel.',
        );
      }

      totalItemsCount = dto.items.length;

      for (const item of dto.items) {
        const itemTotalWeight = item.weightPerItemKg * item.quantity;
        totalWeightKg += itemTotalWeight;

        itemsDataProcessed.push({
          ...item,
          totalItemWeightKg: itemTotalWeight,
        });
      }

      const remainingWeight = Number(trip.remainingWeightCapacityKg);
      if (remainingWeight < totalWeightKg) {
        throw new BadRequestException(
          `Sisa kapasitas bagasi tidak mencukupi. Tersedia: ${remainingWeight} KG, Total Paket: ${totalWeightKg} KG`,
        );
      }

      totalPrice = Number(trip.price) * totalWeightKg;
      otpClaim = this.generateOtp();
    }

    const qrCodeTicket = await this.generateUniqueTicketQr();

    const orderPayload = {
      type: dto.type,
      seatsBooked,
      totalItemsCount,
      totalWeightKg,
      totalPrice,
      qrCodeTicket,
      otpClaim,
    };

    const order = await this.ordersRepository.createOrderWithTransaction(
      dto.tripId,
      customerIdStr,
      orderPayload,
      itemsDataProcessed,
      seatsBooked,
      totalWeightKg,
    );

    return OrderMapper.toResponse(order);
  }

  async getMyOrders(customerIdStr: string) {
    const orders = await this.ordersRepository.findByCustomerId(customerIdStr);
    return OrderMapper.toResponseList(orders);
  }

  async getOrderById(idStr: string) {
    const order = await this.ordersRepository.findById(idStr);
    if (!order) {
      throw new NotFoundException('Order tidak ditemukan.');
    }
    return OrderMapper.toResponse(order);
  }
}
