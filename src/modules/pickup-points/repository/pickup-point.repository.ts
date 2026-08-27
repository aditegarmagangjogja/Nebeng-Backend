import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PickupPointRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    regionId: bigint;
    cityId: bigint;
    operatorId?: bigint;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    qrCodePos: string;
  }) {
    return this.prisma.pickupPoint.create({
      data: {
        regionId: data.regionId,
        cityId: data.cityId,
        operatorId: data.operatorId,
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        qrCodePos: data.qrCodePos,
      },
      include: {
        region: true,
        city: true,
        operator: true,
      },
    });
  }

  async findById(id: bigint) {
    return this.prisma.pickupPoint.findUnique({
      where: { id },
      include: {
        region: true,
        city: true,
        operator: true,
      },
    });
  }

  async findUserById(userId: bigint) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });
  }

  async findAll(regionId?: bigint, cityId?: bigint, onlyActive = false) {
    return this.prisma.pickupPoint.findMany({
      where: {
        ...(regionId && { regionId }),
        ...(cityId && { cityId }),
        ...(onlyActive && { isActive: true }),
      },
      include: {
        region: true,
        city: true,
        operator: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(
    id: bigint,
    data: {
      regionId?: bigint;
      cityId?: bigint;
      operatorId?: bigint;
      name?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.pickupPoint.update({
      where: { id },
      data,
      include: {
        region: true,
        city: true,
        operator: true,
      },
    });
  }
}
