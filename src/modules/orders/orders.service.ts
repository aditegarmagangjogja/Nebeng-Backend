import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersRepository } from './repository/orders.repository';
import { TripsRepository } from '../trips/repository/trips.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderMapper } from './mappers/order.mapper';
import {
  OrderType,
  ParcelSize,
  ServiceType,
  TripStatus,
} from '../../generated/prisma/enums';
import { randomBytes, randomInt } from 'crypto';
import { Role } from '../../generated/prisma/enums';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly tripsRepository: TripsRepository,
    private readonly prisma: PrismaService,
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

    const regionData = trip.originPoint?.regionId
      ? await this.prisma.region.findUnique({
          where: { id: trip.originPoint.regionId },
        })
      : null;

    const regionPricePerKm = regionData?.pricePerKm
      ? Number(regionData.pricePerKm)
      : 3000;

    let seatsBooked = 0;
    let totalItemsCount = 0;
    let totalWeightKg = 0;
    let totalPrice = 0;
    let adminFeePercentage = 10;
    let otpClaim: string | null = null;
    const itemsDataProcessed: any[] = [];

    if (dto.type === OrderType.passenger) {
      const serviceType =
        trip.vehicleType === 'motor' ? ServiceType.motor : ServiceType.mobil;
      const pricingSetting = await this.prisma.pricingSetting.findFirst({
        where: { serviceType, size: null },
      });

      adminFeePercentage = pricingSetting
        ? Number(pricingSetting.adminFeePercentage)
        : 10;

      const baseFare = pricingSetting ? Number(pricingSetting.baseFare) : 5000;
      const farePerKm = pricingSetting
        ? Number(pricingSetting.farePerKm)
        : regionPricePerKm;
      const unitPrice =
        Number(trip.price) > 0 ? Number(trip.price) : baseFare + farePerKm;

      seatsBooked = dto.seatsBooked ?? 1;

      if (trip.seatAvailable < seatsBooked) {
        throw new BadRequestException(
          `Sisa kursi tidak mencukupi. Tersedia: ${trip.seatAvailable}, Diminta: ${seatsBooked}`,
        );
      }

      totalPrice = unitPrice * seatsBooked;
    }

    if (dto.type === OrderType.parcel) {
      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException(
          'Item barang wajib diisi untuk pemesanan jenis Parcel.',
        );
      }

      totalItemsCount = dto.items.length;

      // Ambil pengaturan umum komisi parsel barang
      const defaultParcelSetting = await this.prisma.pricingSetting.findFirst({
        where: { serviceType: ServiceType.barang },
      });
      adminFeePercentage = defaultParcelSetting
        ? Number(defaultParcelSetting.adminFeePercentage)
        : 12;

      for (const item of dto.items) {
        const itemTotalWeight = item.weightPerItemKg * item.quantity;
        totalWeightKg += itemTotalWeight;

        // Validasi dan ambil tarif berdasarkan ukuran matriks paket (XXS - XL)
        const sizeEnum = item.sizeEnum as unknown as ParcelSize;
        const parcelPricing = await this.prisma.pricingSetting.findFirst({
          where: {
            serviceType: ServiceType.barang,
            size: sizeEnum,
          },
        });

        if (!parcelPricing) {
          throw new BadRequestException(
            `Konfigurasi tarif untuk ukuran paket ${item.sizeEnum} tidak ditemukan.`,
          );
        }

        // Validasi batas berat maksimum per ukuran paket
        if (
          parcelPricing.maxWeightKg &&
          item.weightPerItemKg > Number(parcelPricing.maxWeightKg)
        ) {
          throw new BadRequestException(
            `Berat item "${item.itemName}" (${item.weightPerItemKg} KG) melebihi batas maksimum untuk ukuran ${item.sizeEnum} (${parcelPricing.maxWeightKg} KG).`,
          );
        }

        const itemBaseRate = Number(parcelPricing.baseFare);
        const itemFarePerKm = Number(parcelPricing.farePerKm) || 2000;

        // Akumulasi harga per item: (Tarif Dasar Ukuran + Komponen Jarak) * Kuantitas
        const singleItemPrice = (itemBaseRate + itemFarePerKm) * item.quantity;
        totalPrice += singleItemPrice;

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
      adminFeePercentage,
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

  async cancelOrder(currentUser: any, orderIdStr: string) {
    const order = await this.ordersRepository.findById(orderIdStr);
    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan.');
    }

    const currentUserId = String(currentUser.id);
    const userRole = currentUser.role;

    if (userRole === Role.customer || userRole === 'customer') {
      if (order.customerId.toString() !== currentUserId) {
        throw new ForbiddenException(
          'Anda tidak berhak membatalkan pesanan ini.',
        );
      }
      if (order.status !== 'pending_payment') {
        throw new BadRequestException(
          'Pesanan yang sudah dibayar atau berjalan tidak dapat dibatalkan secara mandiri. Silakan hubungi petugas pos.',
        );
      }
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new BadRequestException(
        'Pesanan sudah selesai atau sudah dibatalkan sebelumnya.',
      );
    }

    const seatsToRestore = order.seatsBooked || 0;
    const weightToRestore = Number(order.totalWeightKg) || 0;

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'cancelled',
          escrowStatus: 'refunded',
        },
      });

      await tx.trip.update({
        where: { id: order.tripId },
        data: {
          seatAvailable: { increment: seatsToRestore },
          remainingWeightCapacityKg: { increment: weightToRestore },
        },
      });

      return {
        message:
          'Pesanan berhasil dibatalkan dan kuota kursi/bagasi trip telah dikembalikan.',
        order: OrderMapper.toResponse(updatedOrder),
      };
    });
  }

  async getMyOrders(customerIdStr: string) {
    const orders = await this.ordersRepository.findByCustomerId(customerIdStr);
    return OrderMapper.toResponseList(orders);
  }

  async getOrderById(currentUser: any, idStr: string) {
    const order = await this.ordersRepository.findById(idStr);
    if (!order) {
      throw new NotFoundException('Order tidak ditemukan.');
    }

    const currentUserId = String(currentUser.id);
    const userRole = currentUser.role;

    if (userRole === Role.customer || userRole === 'customer') {
      if (order.customerId.toString() !== currentUserId) {
        throw new ForbiddenException(
          'Anak tidak memiliki akses ke pesanan ini.',
        );
      }
    }

    if (userRole === Role.mitra || userRole === 'mitra') {
      if (order.trip.mitraId.toString() !== currentUserId) {
        throw new ForbiddenException(
          'Anda hanya dapat melihat pesanan di trip milik Anda.',
        );
      }
    }

    if (userRole === Role.regional || userRole === 'regional') {
      const userRegionId = currentUser.regionId
        ? currentUser.regionId.toString()
        : null;
      const originRegionId = order.trip.originPoint?.regionId?.toString();
      const destRegionId = order.trip.destinationPoint?.regionId?.toString();

      if (
        !userRegionId ||
        (userRegionId !== originRegionId && userRegionId !== destRegionId)
      ) {
        throw new ForbiddenException(
          'Anda hanya dapat melihat pesanan di wilayah operasional Anda.',
        );
      }
    }

    return OrderMapper.toResponse(order);
  }
}
