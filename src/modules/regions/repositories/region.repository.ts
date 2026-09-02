import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserStatus } from '../../../generated/prisma/enums';

@Injectable()
export class RegionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async createRegion(data: { name: string; code: string }) {
    return this.prisma.region.create({
      data: {
        name: data.name.trim(),
        code: data.code.toUpperCase().trim(),
      },
      include: {
        users: {
          where: { role: 'regional', status: UserStatus.active },
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });
  }

  async findRegionById(id: string) {
    const parseId = this.safeParseBigInt(id);
    if (!parseId) return null;

    return this.prisma.region.findUnique({
      where: { id: parseId },
      include: {
        users: {
          where: { role: 'regional', status: UserStatus.active },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            statusVerification: true,
          },
        },
        pickupPoints: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });
  }

  async findRegionByCode(code: string) {
    return this.prisma.region.findUnique({
      where: { code: code.toUpperCase().trim() },
    });
  }

  async findAllRegions(onlyActive = false) {
    return this.prisma.region.findMany({
      where: onlyActive ? { isActive: true } : {},
      include: {
        users: {
          where: { role: 'regional', status: UserStatus.active },
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateRegion(
    id: string,
    data: { name?: string; code?: string; isActive?: boolean },
  ) {
    const parseId = this.safeParseBigInt(id);
    if (!parseId) {
      throw new BadRequestException('Format ID region tidak valid');
    }

    return this.prisma.region.update({
      where: { id: parseId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.code && { code: data.code.toUpperCase().trim() }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        users: {
          where: { role: 'regional', status: UserStatus.active },
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });
  }

  async createCity(data: { name: string; province: string }) {
    return this.prisma.city.create({
      data: {
        name: data.name.trim(),
        province: data.province.trim(),
      },
    });
  }

  async findCityByNameAndProvince(name: string, province: string) {
    return this.prisma.city.findFirst({
      where: {
        name: { equals: name.trim() },
        province: { equals: province.trim() },
      },
    });
  }

  async findAllCities() {
    return this.prisma.city.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findCityById(id: string) {
    const parseId = this.safeParseBigInt(id);
    if (!parseId) return null;
    return this.prisma.city.findUnique({
      where: { id: parseId },
    });
  }
}
