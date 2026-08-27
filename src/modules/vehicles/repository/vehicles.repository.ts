import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class VehiclesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: bigint, data: any) {
    return this.prisma.vehicle.create({
      data: {
        userId,
        type: data.type,
        model: data.model,
        plateNumber: data.plateNumber,
        color: data.color,
        capacitySeats: data.capacitySeats,
        maxWeightCapacityKg: data.maxWeightCapacityKg,
      },
    });
  }

  async findByUserId(userId: bigint) {
    return this.prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: bigint) {
    return this.prisma.vehicle.findUnique({
      where: { id },
    });
  }

  async findUserVerificationStatus(userId: bigint) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { statusVerification: true },
    });
  }

  async findByPlateNumber(plateNumber: string) {
    return this.prisma.vehicle.findFirst({
      where: { plateNumber },
    });
  }

  async update(id: bigint, data: any) {
    return this.prisma.vehicle.update({
      where: { id },
      data,
    });
  }
}
