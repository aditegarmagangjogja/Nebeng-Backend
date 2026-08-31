import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RegionRepository } from './repositories/region.repository';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { CreateCityDto } from './dto/create-city.dto';
import { RegionMapper } from './mappers/region.mapper';

@Injectable()
export class RegionService {
  constructor(private readonly regionRepo: RegionRepository) {}

  async createRegion(dto: CreateRegionDto) {
    const existing = await this.regionRepo.findRegionByCode(dto.code);
    if (existing) {
      throw new ConflictException(
        `Region dengan kode ${dto.code} sudah terdaftar`,
      );
    }

    const region = await this.regionRepo.createRegion(dto);
    return RegionMapper.toRegionResponse(region);
  }

  async getAllRegions(onlyActive = false) {
    const regions = await this.regionRepo.findAllRegions(onlyActive);
    return regions.map(RegionMapper.toRegionResponse);
  }

  async getRegionById(id: string) {
    const region = await this.regionRepo.findRegionById(id);
    if (!region) {
      throw new NotFoundException('Region tidak ditemukan');
    }
    return RegionMapper.toRegionResponse(region);
  }

  async updateRegion(id: string, dto: UpdateRegionDto) {
    const region = await this.regionRepo.findRegionById(id);
    if (!region) {
      throw new NotFoundException('Region tidak ditemukan');
    }

    if (dto.code && dto.code.toUpperCase() !== region.code) {
      const existing = await this.regionRepo.findRegionByCode(dto.code);
      if (existing) {
        throw new ConflictException(
          `Region dengan kode ${dto.code} sudah terdaftar`,
        );
      }
    }

    const updated = await this.regionRepo.updateRegion(id, dto);
    return RegionMapper.toRegionResponse(updated);
  }

  async createCity(dto: CreateCityDto) {
    const existingCity = await this.regionRepo.findCityByNameAndProvince(
      dto.name,
      dto.province,
    );

    if (existingCity) {
      throw new ConflictException(
        `Kota ${dto.name} di Provinsi ${dto.province} sudah terdaftar`,
      );
    }

    const city = await this.regionRepo.createCity(dto);
    return RegionMapper.toCityResponse(city);
  }

  async getAllCities() {
    const cities = await this.regionRepo.findAllCities();
    return cities.map(RegionMapper.toCityResponse);
  }
}
