import { Injectable, NotFoundException } from '@nestjs/common';
import { BannersRepository } from './repository/banners.repository';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { Role } from '../../generated/prisma/enums';

@Injectable()
export class BannersService {
  constructor(private readonly repository: BannersRepository) {}

  async findAll(targetRole?: Role) {
    const banners = await this.repository.findAll(targetRole);
    // Convert BigInt to string for response
    return banners.map((b) => ({
      ...b,
      id: b.id.toString(),
    }));
  }

  async findOne(id: string) {
    const banner = await this.repository.findById(id);
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    return {
      ...banner,
      id: banner.id.toString(),
    };
  }

  async create(dto: CreateBannerDto) {
    const banner = await this.repository.create(dto);
    return {
      ...banner,
      id: banner.id.toString(),
    };
  }

  async update(id: string, dto: UpdateBannerDto) {
    await this.findOne(id);
    const banner = await this.repository.update(id, dto);
    return {
      ...banner,
      id: banner.id.toString(),
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    const banner = await this.repository.delete(id);
    return {
      ...banner,
      id: banner.id.toString(),
    };
  }
}
