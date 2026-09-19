import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MerchandiseRepository } from './repository/merchandise.repository';
import { CreateMerchandiseDto } from './dto/create-merchandise.dto';
import { UpdateMerchandiseDto } from './dto/update-merchandise.dto';
import { RedeemMerchandiseDto } from './dto/redeem-merchandise.dto';
import { UpdateRedemptionStatusDto } from './dto/update-redemption-status.dto';
import { MerchandiseMapper } from './mappers/merchandise.mapper';

@Injectable()
export class MerchandiseService {
  constructor(private readonly repository: MerchandiseRepository) {}

  async getAllItems(onlyActive = true) {
    const items = await this.repository.findAllItems(onlyActive);
    return items.map(MerchandiseMapper.toItemResponse);
  }

  async getItemById(id: string) {
    const item = await this.repository.findItemById(id);
    if (!item)
      throw new NotFoundException('Barang merchandise tidak ditemukan.');
    return MerchandiseMapper.toItemResponse(item);
  }

  async createItem(dto: CreateMerchandiseDto) {
    const item = await this.repository.createItem(dto);
    return MerchandiseMapper.toItemResponse(item);
  }

  async updateItem(id: string, dto: UpdateMerchandiseDto) {
    const existing = await this.repository.findItemById(id);
    if (!existing)
      throw new NotFoundException('Barang merchandise tidak ditemukan.');
    const updated = await this.repository.updateItem(id, dto);
    return MerchandiseMapper.toItemResponse(updated);
  }

  async deleteItem(id: string) {
    const existing = await this.repository.findItemById(id);
    if (!existing)
      throw new NotFoundException('Barang merchandise tidak ditemukan.');
    await this.repository.deleteItem(id);
    return { message: 'Merchandise berhasil dinonaktifkan.' };
  }

  async redeemItem(userId: string, dto: RedeemMerchandiseDto) {
    if (!dto.shippingAddress && !dto.pickupPosId) {
      throw new BadRequestException(
        'Pilih salah satu metode penerimaan: Isi Alamat Pengiriman atau Pilih Pos Pengambilan.',
      );
    }

    const item = await this.repository.findItemById(dto.merchandiseId);
    if (!item)
      throw new NotFoundException('Barang merchandise tidak ditemukan.');

    const redemption = await this.repository.executeRedeemTransaction({
      userIdStr: userId,
      merchandiseIdStr: dto.merchandiseId,
      pointsSpent: Number(item.pointsRequired),
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      shippingAddress: dto.shippingAddress,
      pickupPosIdStr: dto.pickupPosId,
    });

    return {
      message:
        'Penukaran poin berhasil! Tim kami akan segera memproses barang Anda.',
      redemption: MerchandiseMapper.toRedemptionResponse(redemption),
    };
  }

  async getMyRedemptions(userId: string) {
    const records = await this.repository.findRedemptionsByUser(userId);
    return records.map(MerchandiseMapper.toRedemptionResponse);
  }

  async getAllRedemptionsAdmin() {
    const records = await this.repository.findAllRedemptions();
    return records.map(MerchandiseMapper.toRedemptionResponse);
  }

  async updateRedemptionStatusAdmin(
    id: string,
    dto: UpdateRedemptionStatusDto,
  ) {
    const updated = await this.repository.updateRedemptionStatus(
      id,
      dto.status,
      dto.trackingNumber,
    );
    return {
      message: `Status penukaran berhasil diperbarui menjadi ${dto.status}.`,
      redemption: MerchandiseMapper.toRedemptionResponse(updated),
    };
  }
}
