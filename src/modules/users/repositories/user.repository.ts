import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, User } from '../../../generated/prisma/client';
import { UserStatus } from '../../../generated/prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: BigInt(id) },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  async findRegionById(regionId: string) {
    return this.prisma.region.findUnique({
      where: { id: BigInt(regionId) },
    });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        status: {
          not: UserStatus.deleted, // Sembunyikan akun yang sudah dianonimkan dari daftar umum
        },
      },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id: BigInt(id) },
      data,
    });
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: BigInt(id) },
      data: { refreshToken },
    });
  }

  async updatePin(id: string, pinHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: BigInt(id) },
      data: { pinHash },
    });
  }

  // Hitung riwayat transaksi untuk Hard Delete Guard
  async countUserRelations(id: string): Promise<{
    ordersCount: number;
    tripsCount: number;
    walletTransactionsCount: number;
  }> {
    const userIdBigInt = BigInt(id);

    const [ordersCount, tripsCount, wallet] = await Promise.all([
      this.prisma.order.count({ where: { customerId: userIdBigInt } }),
      this.prisma.trip.count({ where: { mitraId: userIdBigInt } }),
      this.prisma.wallet.findUnique({
        where: { userId: userIdBigInt },
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

  // Soft Delete & Anonisasi Data (Atomic Transaction)
  async anonymize(id: string, anonymousId: string): Promise<User> {
    const userIdBigInt = BigInt(id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Hapus profil KTP / Bank / Face ID jika ada
      await tx.userProfile.deleteMany({
        where: { userId: userIdBigInt },
      });

      // 2. Anonimkan data utama user
      return tx.user.update({
        where: { id: userIdBigInt },
        data: {
          name: 'Pengguna Dihapus',
          email: `${anonymousId}@deleted.local`,
          phone: `000${Date.now().toString().slice(-9)}`,
          password: 'DELETED_ACCOUNT_NO_LOGIN',
          avatar: null,
          pinHash: null,
          refreshToken: null,
          status: UserStatus.deleted,
        },
      });
    });
  }

  // Hard Delete Fisik (Hanya digunakan jika belum ada riwayat transaksi)
  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id: BigInt(id) },
    });
  }
}
