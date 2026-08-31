import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, User } from '../../../generated/prisma/client';
import { UserStatus } from '../../../generated/prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
      include: { profile: true, region: true },
    });
  }

  async findById(id: string): Promise<any | null> {
    const parseId = this.safeParseBigInt(id);
    if (!parseId) return null;

    return this.prisma.user.findUnique({
      where: { id: parseId },
      include: { profile: true, region: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLocaleLowerCase().trim() },
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phone: phone.trim() },
    });
  }

  async findRegionById(regionId: string) {
    const parseid = this.safeParseBigInt(regionId);
    if (!parseid) return null;

    return this.prisma.region.findUnique({
      where: { id: parseid },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.user.findMany({
      where: {
        status: {
          not: UserStatus.deleted,
        },
      },
      include: { profile: true, region: true },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    const parseId = this.safeParseBigInt(id);
    if (!parseId) throw new Error('Invalid ID format');

    return this.prisma.user.update({
      where: { id: parseId },
      data,
      include: { profile: true, region: true },
    });
  }

  async upsertProfile(userIdStr: string, profileData: any) {
    const parseId = this.safeParseBigInt(userIdStr);
    if (!parseId) throw new BadRequestException('Format ID tidak valid');

    return this.prisma.userProfile.upsert({
      where: { userId: parseId },
      update: profileData,
      create: {
        userId: parseId,
        ...profileData,
      },
    });
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<User> {
    const parseId = this.safeParseBigInt(id);
    if (!parseId) throw new Error('Invalid ID format');

    return this.prisma.user.update({
      where: { id: parseId },
      data: { refreshToken },
    });
  }

  async updatePin(id: string, pinHash: string): Promise<User> {
    const parseId = this.safeParseBigInt(id);
    if (!parseId) throw new Error('Invalid ID format');

    return this.prisma.user.update({
      where: { id: parseId },
      data: { pinHash },
    });
  }

  async countUserRelations(id: string): Promise<{
    ordersCount: number;
    tripsCount: number;
    walletTransactionsCount: number;
  }> {
    const parseId = this.safeParseBigInt(id);
    if (!parseId) {
      return { ordersCount: 0, tripsCount: 0, walletTransactionsCount: 0 };
    }

    const [ordersCount, tripsCount, wallet] = await Promise.all([
      this.prisma.order.count({ where: { customerId: parseId } }),
      this.prisma.trip.count({ where: { mitraId: parseId } }),
      this.prisma.wallet.findUnique({
        where: { userId: parseId },
        select: {
          _count: {
            select: { transactions: true },
          },
        },
      }),
    ]);

    return {
      ordersCount,
      tripsCount,
      walletTransactionsCount: wallet?._count.transactions ?? 0,
    };
  }

  async anonymize(id: string, anonymousId: string): Promise<User> {
    const parseId = this.safeParseBigInt(id);
    if (!parseId) throw new Error('Invalid ID format');

    return this.prisma.$transaction(async (tx) => {
      await tx.userProfile.deleteMany({
        where: { userId: parseId },
      });

      return tx.user.update({
        where: { id: parseId },
        data: {
          name: 'Pengguna Dihapus',
          email: `${anonymousId}@deleted.local`,
          phone: `DEL_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
          password: 'DELETED_ACCOUNT_NO_LOGIN',
          avatar: null,
          pinHash: null,
          refreshToken: null,
          status: UserStatus.deleted,
        },
      });
    });
  }

  async delete(id: string): Promise<User> {
    const parseId = this.safeParseBigInt(id);
    if (!parseId) {
      throw new BadRequestException('Format id tidak valid');
    }

    return this.prisma.user.delete({
      where: { id: parseId },
    });
  }
}
