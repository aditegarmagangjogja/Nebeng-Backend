import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class VehiclesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async create(userId: string, data: any) {
    const parsedId = this.safeParseBigInt(userId);
    if (!parsedId) throw new BadRequestException('Format ID user tidak valid');

    return this.prisma.vehicle.create({
      data: {
        userId: parsedId,
        type: data.type,
        model: data.model.trim(),
        plateNumber: data.plateNumber.toUpperCase().replace(/\s+/g, '').trim(),
        color: data.color.trim(),
        capacitySeats: data.capacitySeats,
        maxWeightCapacityKg: data.maxWeightCapacityKg,
      },
    });
  }

  async findByUserId(userId: string) {
    const parseId = this.safeParseBigInt(userId);
    if (!parseId) return [];

    return this.prisma.vehicle.findMany({
      where: { userId: parseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const parsedId = this.safeParseBigInt(id);
    if (!parsedId) return null;
    return this.prisma.vehicle.findUnique({
      where: { id: parsedId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            statusVerification: true,
          },
        },
      },
    });
  }

  async findUserVerificationStatus(userId: string) {
    const parsedId = this.safeParseBigInt(userId);
    if (!parsedId) return null;

    return this.prisma.user.findUnique({
      where: { id: parsedId },
      select: {
        id: true,
        role: true,
        statusVerification: true,
      },
    });
  }

  async findByPlateNumber(plateNumber: string) {
    const cleanPlate = plateNumber.toUpperCase().replace(/\s+/g, '').trim();
    return this.prisma.vehicle.findFirst({
      where: { plateNumber: cleanPlate },
    });
  }

  async countActiveTrips(vehicleId: string) {
    const parsedId = this.safeParseBigInt(vehicleId);
    if (!parsedId) return 0;

    return this.prisma.trip.count({
      where: {
        vehicleId: parsedId,
        status: {
          in: ['scheduled', 'in_transit', 'arrived_dest_pos'],
        },
      },
    });
  }

  async update(id: string, data: any) {
    const parsedId = this.safeParseBigInt(id);
    if (!parsedId)
      throw new BadRequestException('Format id kendaraan tidak valid');

    return this.prisma.vehicle.update({
      where: { id: parsedId },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.model && { model: data.model.trim() }),
        ...(data.plateNumber && {
          plateNumber: data.plateNumber
            .toUpperCase()
            .replace(/\s+/g, '')
            .trim(),
        }),
        ...(data.color && { color: data.color.trim() }),
        ...(data.capacitySeats !== undefined && {
          capacitySeats: data.capacitySeats,
        }),
        ...(data.maxWeightCapacityKg !== undefined && {
          maxWeightCapacityKg: data.maxWeightCapacityKg,
        }),
      },
    });
  }

  async delete(id: string) {
    const parsedId = this.safeParseBigInt(id);
    if (!parsedId)
      throw new BadRequestException('Format id kendaraan tidak valid');

    return this.prisma.vehicle.delete({
      where: { id: parsedId },
    });
  }
}
