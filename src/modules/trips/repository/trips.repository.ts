import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TripsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async create(data: any) {
    return this.prisma.trip.create({
      data,
      include: {
        mitra: true,
        vehicle: true,
        originPoint: {
          include: { region: true },
        },
        destinationPoint: {
          include: { region: true },
        },
      },
    });
  }

  async findConflictingTrip(vehicleId: bigint, departureDate: Date) {
    return this.prisma.trip.findFirst({
      where: {
        vehicleId,
        departureDate,
        status: {
          in: ['scheduled', 'in_transit'],
        },
      },
    });
  }

  async findAll(filters: any) {
    return this.prisma.trip.findMany({
      where: filters,
      include: {
        mitra: true,
        vehicle: true,
        originPoint: {
          include: { region: true },
        },
        destinationPoint: {
          include: { region: true },
        },
      },
      orderBy: [{ departureDate: 'asc' }, { departureTime: 'asc' }],
    });
  }

  async findById(id: string) {
    const parsedId = this.safeParseBigInt(id);
    if (!parsedId) return null;

    return this.prisma.trip.findUnique({
      where: { id: parsedId },
      include: {
        mitra: true,
        vehicle: true,
        originPoint: {
          include: { region: true },
        },
        destinationPoint: {
          include: { region: true },
        },
      },
    });
  }

  async findByQrCode(qrCodeTrip: string) {
    return this.prisma.trip.findUnique({
      where: { qrCodeTrip },
      include: {
        originPoint: {
          include: { region: true },
        },
        destinationPoint: {
          include: { region: true },
        },
      },
    });
  }

  async update(id: string, data: any) {
    const parsedId = this.safeParseBigInt(id);
    if (!parsedId) {
      throw new BadRequestException('Format id trip tidak valid');
    }

    return this.prisma.trip.update({
      where: { id: parsedId },
      data,
      include: {
        mitra: true,
        vehicle: true,
        originPoint: {
          include: { region: true },
        },
        destinationPoint: {
          include: { region: true },
        },
      },
    });
  }
}
