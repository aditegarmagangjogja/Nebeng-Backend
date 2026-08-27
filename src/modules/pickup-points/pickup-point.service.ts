import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PickupPointRepository } from './repository/pickup-point.repository';
import { CreatePickupPointDto } from './dto/create-pickup-point.dto';
import { UpdatePickupPointDto } from './dto/update-pickup-point.dto';
import { PickupPointMapper } from './mappers/pickup-point.mapper';
import { randomBytes } from 'crypto';
import { Role } from '../../generated/prisma/enums';

@Injectable()
export class PickupPointService {
  constructor(private readonly pickupPointRepo: PickupPointRepository) {}

  private generateQrCodePos(): string {
    return `POS-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private async validateOperatorUser(operatorIdStr: string) {
    const operatorId = BigInt(operatorIdStr);
    const user = await this.pickupPointRepo.findUserById(operatorId);

    if (!user) {
      throw new NotFoundException('User operator tidak ditemukan');
    }

    if (user.role !== Role.operator_pos) {
      throw new BadRequestException(
        'User yang dipilih harus mempunyai role operator pos',
      );
    }
  }

  async create(dto: CreatePickupPointDto) {
    if (dto.operatorId) {
      await this.validateOperatorUser(dto.operatorId);
    }

    const qrCodePos = this.generateQrCodePos();

    const created = await this.pickupPointRepo.create({
      regionId: BigInt(dto.regionId),
      cityId: BigInt(dto.cityId),
      operatorId: dto.operatorId ? BigInt(dto.operatorId) : undefined,
      name: dto.name,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      qrCodePos,
    });

    return PickupPointMapper.toResponse(created);
  }

  async findAll(regionId?: string, cityId?: string, onlyActive = false) {
    const list = await this.pickupPointRepo.findAll(
      regionId ? BigInt(regionId) : undefined,
      cityId ? BigInt(cityId) : undefined,
      onlyActive,
    );
    return list.map(PickupPointMapper.toResponse);
  }

  async findOne(id: string) {
    const pos = await this.pickupPointRepo.findById(BigInt(id));
    if (!pos) {
      throw new NotFoundException('Pickup Point/Pos tidak ditemukan');
    }
    return PickupPointMapper.toResponse(pos);
  }

  async update(id: string, dto: UpdatePickupPointDto) {
    const pos = await this.pickupPointRepo.findById(BigInt(id));
    if (!pos) {
      throw new NotFoundException('Pickup Point/Pos tidak ditemukan');
    }

    if (dto.operatorId) {
      await this.validateOperatorUser(dto.operatorId);
    }

    const updated = await this.pickupPointRepo.update(BigInt(id), {
      ...(dto.regionId && { regionId: BigInt(dto.regionId) }),
      ...(dto.cityId && { cityId: BigInt(dto.cityId) }),
      ...(dto.operatorId && { operatorId: BigInt(dto.operatorId) }),
      ...(dto.name && { name: dto.name }),
      ...(dto.address && { address: dto.address }),
      ...(dto.latitude !== undefined && { latitude: dto.latitude }),
      ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    return PickupPointMapper.toResponse(updated);
  }
}
