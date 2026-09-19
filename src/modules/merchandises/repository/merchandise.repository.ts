import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMerchandiseDto } from '../dto/create-merchandise.dto';
import { UpdateMerchandiseDto } from '../dto/update-merchandise.dto';
import { RewardType } from '../../../generated/prisma/enums';

@Injectable()
export class MerchandiseRepository {
  constructor(private readonly prisma: PrismaService) {}

  private safeBigInt(id: string | number): bigint {
    try {
      return BigInt(id);
    } catch {
      throw new BadRequestException(`ID '${id}' tidak valid.`);
    }
  }

  async findAllItems(onlyActive = true) {
    return this.prisma.merchandiseItem.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { pointsRequired: 'asc' },
    });
  }

  async findItemById(idStr: string) {
    return this.prisma.merchandiseItem.findUnique({
      where: { id: this.safeBigInt(idStr) },
    });
  }

  async createItem(dto: CreateMerchandiseDto) {
    return this.prisma.merchandiseItem.create({
      data: {
        name: dto.name,
        description: dto.description,
        pointsRequired: dto.pointsRequired,
        stock: dto.stock,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async updateItem(idStr: string, dto: UpdateMerchandiseDto) {
    return this.prisma.merchandiseItem.update({
      where: { id: this.safeBigInt(idStr) },
      data: dto,
    });
  }

  async deleteItem(idStr: string) {
    return this.prisma.merchandiseItem.update({
      where: { id: this.safeBigInt(idStr) },
      data: { isActive: false },
    });
  }

  // TRANSAKSI ATOMIK PENUKARAN REWARD POIN
  async executeRedeemTransaction(params: {
    userIdStr: string;
    merchandiseIdStr: string;
    pointsSpent: number;
    recipientName: string;
    recipientPhone: string;
    shippingAddress?: string;
    pickupPosIdStr?: string;
  }) {
    const userId = this.safeBigInt(params.userIdStr);
    const merchandiseId = this.safeBigInt(params.merchandiseIdStr);
    const pickupPosId = params.pickupPosIdStr
      ? this.safeBigInt(params.pickupPosIdStr)
      : null;

    return this.prisma.$transaction(async (tx) => {
      // 1. Validasi saldo poin customer
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new BadRequestException('Pengguna tidak ditemukan.');
      if (user.rewardPoints < params.pointsSpent) {
        throw new BadRequestException(
          `Poin Anda (${user.rewardPoints}) tidak mencukupi untuk klaim ini (${params.pointsSpent} poin).`,
        );
      }

      // 2. Validasi stok barang
      const item = await tx.merchandiseItem.findUnique({
        where: { id: merchandiseId },
      });
      if (!item || !item.isActive)
        throw new BadRequestException('Merchandise tidak tersedia.');
      if (item.stock < 1)
        throw new BadRequestException('Stok merchandise ini telah habis.');

      // 3. Kurangi stok barang
      await tx.merchandiseItem.update({
        where: { id: merchandiseId },
        data: { stock: { decrement: 1 } },
      });

      // 4. Kurangi saldo poin user
      await tx.user.update({
        where: { id: userId },
        data: { rewardPoints: { decrement: params.pointsSpent } },
      });

      // 5. Catat riwayat mutasi reward poin
      await tx.rewardTransaction.create({
        data: {
          userId,
          points: params.pointsSpent,
          type: RewardType.redeem,
          description: `Penukaran Merchandise: ${item.name}`,
        },
      });

      // 6. Buat tiket antrean penukaran merchandise
      return tx.merchandiseRedemption.create({
        data: {
          userId,
          merchandiseId,
          pointsSpent: params.pointsSpent,
          recipientName: params.recipientName,
          recipientPhone: params.recipientPhone,
          shippingAddress: params.shippingAddress,
          pickupPosId,
          status: 'pending',
        },
        include: { merchandise: true, user: true, pickupPos: true },
      });
    });
  }

  async findRedemptionsByUser(userIdStr: string) {
    return this.prisma.merchandiseRedemption.findMany({
      where: { userId: this.safeBigInt(userIdStr) },
      include: { merchandise: true, pickupPos: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllRedemptions() {
    return this.prisma.merchandiseRedemption.findMany({
      include: { merchandise: true, user: true, pickupPos: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRedemptionStatus(
    idStr: string,
    status: any,
    trackingNumber?: string,
  ) {
    return this.prisma.merchandiseRedemption.update({
      where: { id: this.safeBigInt(idStr) },
      data: {
        status,
        ...(trackingNumber ? { trackingNumber } : {}),
      },
      include: { merchandise: true, user: true, pickupPos: true },
    });
  }
}
