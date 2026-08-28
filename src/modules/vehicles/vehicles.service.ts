import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VehiclesRepository } from './repository/vehicles.repository';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleMapper } from './mappers/vehicle.mapper';
import { VehicleType, VerificationStatus } from '../../generated/prisma/enums';

@Injectable()
export class VehicleService {
  constructor(private readonly vehiclesRepository: VehiclesRepository) {}

  async createVehicle(userIdStr: string, dto: CreateVehicleDto) {
    const user =
      await this.vehiclesRepository.findUserVerificationStatus(userIdStr);
    if (!user || user.statusVerification !== VerificationStatus.approved) {
      throw new ForbiddenException(
        'Akun anda belum disetujui. Selesaikan verifikasi identitas terlebih dahulu.',
      );
    }

    const cleanPlate = dto.plateNumber.toUpperCase().replace(/\s+/g, '').trim();
    const existingPlate =
      await this.vehiclesRepository.findByPlateNumber(cleanPlate);

    if (existingPlate) {
      throw new BadRequestException('Nomor plat sudah terdaftar di sistem');
    }

    let finalSeats = dto.capacitySeats;
    let finalWeight = dto.maxWeightCapacityKg;

    if (dto.type === VehicleType.motor) {
      finalSeats = 1;
      if (!dto.maxWeightCapacityKg || dto.maxWeightCapacityKg > 15) {
        finalWeight = 15.0;
      }
    }

    const vehicle = await this.vehiclesRepository.create(userIdStr, {
      ...dto,
      capacitySeats: finalSeats,
      maxWeightCapacityKg: finalWeight,
    });

    return VehicleMapper.toResponse(vehicle);
  }

  async getMyVehicles(userIdStr: string) {
    const vehicle = await this.vehiclesRepository.findByUserId(userIdStr);
    return vehicle.map(VehicleMapper.toResponse);
  }

  async getVehicleById(idStr: string) {
    const vehicle = await this.vehiclesRepository.findById(idStr);
    if (!vehicle) {
      throw new NotFoundException('Data kendaraan tidak ditemukan');
    }
    return VehicleMapper.toResponse(vehicle);
  }

  async updateVehicle(idStr: string, userIdStr: string, dto: UpdateVehicleDto) {
    const vehicle = await this.vehiclesRepository.findById(idStr);
    if (!vehicle) {
      throw new NotFoundException('Data kendaraan tidak ditemukan.');
    }

    if (vehicle.userId.toString() !== userIdStr) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk mengedit kendaraan ini.',
      );
    }

    if (dto.plateNumber) {
      const cleanPlate = dto.plateNumber
        .toUpperCase()
        .replace(/\s+/g, '')
        .trim();
      const existingPlate =
        await this.vehiclesRepository.findByPlateNumber(cleanPlate);
      if (existingPlate && existingPlate.id.toString() !== idStr) {
        throw new ConflictException(
          'Nomor plat kendaraan sudah digunakan oleh kendaraan lain',
        );
      }
    }

    let targetSeats = dto.capacitySeats;
    let targetWeight = dto.maxWeightCapacityKg;
    const vehicleType = dto.type || vehicle.type;

    if (vehicleType === VehicleType.motor) {
      targetSeats = 1;
      if (dto.maxWeightCapacityKg && dto.maxWeightCapacityKg > 15) {
        targetWeight = 15.0;
      }
    }

    const updated = await this.vehiclesRepository.update(idStr, {
      ...dto,
      ...(targetSeats !== undefined && { capacitySeats: targetSeats }),
      ...(targetWeight !== undefined && { maxWeightCapacityKg: targetWeight }),
    });
    return VehicleMapper.toResponse(updated);
  }
}
