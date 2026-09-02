import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async createOrderWithTransaction(
    tripId: string,
    customerId: string,
    orderData: any,
    itemsData: any[],
    seatsToDeduct: number,
    weightToDeduct: number,
  ) {
    const parseTripId = this.safeParseBigInt(tripId);
    const parseCustomerId = this.safeParseBigInt(customerId);

    if (!parseTripId || !parseCustomerId) {
      throw new BadRequestException('Format id trip atau customer tidak valid');
    }

    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: parseTripId },
        select: {
          id: true,
          seatAvailable: true,
          remainingWeightCapacityKg: true,
          status: true,
        },
      });

      if (!trip) {
        throw new BadRequestException('Jadwal trip tidak ditemukan.');
      }

      if (trip.status !== 'scheduled') {
        throw new BadRequestException(
          'Pemesanan ditutup. Trip sudah berjalan atau selesai.',
        );
      }

      if (trip.seatAvailable < seatsToDeduct) {
        throw new BadRequestException(
          'Maaf, sisa kursi pada perjalanan ini sudah habis / tidak mencukupi.',
        );
      }

      if (Number(trip.remainingWeightCapacityKg) < weightToDeduct) {
        throw new BadRequestException(
          'Maaf, kapasitas sisa berat muatan pada trip ini tidak mencukupi.',
        );
      }

      const createdOrder = await tx.order.create({
        data: {
          tripId: parseTripId,
          customerId: parseCustomerId,
          type: orderData.type,
          seatsBooked: orderData.seatsBooked,
          totalItemsCount: orderData.totalItemsCount,
          totalWeightKg: orderData.totalWeightKg,
          totalPrice: orderData.totalPrice,
          qrCodeTicket: orderData.qrCodeTicket,
          otpClaim: orderData.otpClaim,
          status: 'pending_payment',
          escrowStatus: 'pending',
        },
      });

      if (itemsData && itemsData.length > 0) {
        await tx.itemOrder.createMany({
          data: itemsData.map((item) => ({
            orderId: createdOrder.id,
            itemName: item.itemName,
            itemCategory: item.itemCategory,
            quantity: item.quantity,
            weightPerItemKg: item.weightPerItemKg,
            totalItemWeightKg: item.totalItemWeightKg,
            sizeEnum: item.sizeEnum,
            photoUrl: item.photoUrl,
            recipientName: item.recipientName,
            recipientPhone: item.recipientPhone,
          })),
        });
      }

      await tx.trip.update({
        where: { id: parseTripId },
        data: {
          seatAvailable: { decrement: seatsToDeduct },
          remainingWeightCapacityKg: { decrement: weightToDeduct },
        },
      });

      return tx.order.findUnique({
        where: { id: createdOrder.id },
        include: {
          trip: {
            include: {
              originPoint: true,
              destinationPoint: true,
              mitra: true,
            },
          },
          customer: true,
          itemOrders: true,
        },
      });
    });
  }

  async findByCustomerId(customerId: string) {
    const parseCustomerId = this.safeParseBigInt(customerId);
    if (!parseCustomerId) return [];

    return this.prisma.order.findMany({
      where: { customerId: parseCustomerId },
      include: {
        trip: {
          include: {
            originPoint: true,
            destinationPoint: true,
          },
        },
        itemOrders: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const parseId = this.safeParseBigInt(id);
    if (!parseId) return null;

    return this.prisma.order.findUnique({
      where: { id: parseId },
      include: {
        trip: {
          include: {
            originPoint: {
              include: {
                region: true,
              },
            },
            destinationPoint: true,
            mitra: true,
          },
        },
        customer: true,
        itemOrders: true,
      },
    });
  }

  async findByTicketQr(qrCodeTicket: string) {
    return this.prisma.order.findUnique({
      where: { qrCodeTicket },
    });
  }

  async updateStatus(id: string, status: any, escrowStatus?: any) {
    const parseId = this.safeParseBigInt(id);
    if (!parseId) {
      throw new BadRequestException('Format Id order tidak valid');
    }

    return this.prisma.order.update({
      where: { id: parseId },
      data: {
        status,
        ...(escrowStatus && { escrowStatus }),
      },
      include: {
        trip: true,
        itemOrders: true,
      },
    });
  }
}
