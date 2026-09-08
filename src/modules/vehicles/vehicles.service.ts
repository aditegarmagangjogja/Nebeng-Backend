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
import { VehicleType } from '../../generated/prisma/enums';

@Injectable()
export class VehicleService {
  constructor(private readonly vehiclesRepository: VehiclesRepository) {}

  async createVehicle(userIdStr: string, dto: CreateVehicleDto) {
    const user =
      await this.vehiclesRepository.findUserVerificationStatus(userIdStr);
    if (!user) {
      throw new ForbiddenException('Data pengguna tidak ditemukan di sistem.');
    }

    const cleanPlate = dto.plateNumber.toUpperCase().replace(/\s+/g, '').trim();
    const existingPlate =
      await this.vehiclesRepository.findByPlateNumber(cleanPlate);

    if (existingPlate) {
      throw new ConflictException(
        'Nomor plat kendaraan sudah terdaftar di sistem.',
      );
    }

    let finalSeats = dto.capacitySeats ?? 1;
    let finalWeight = dto.maxWeightCapacityKg ?? 10;

    if (dto.type === VehicleType.motor) {
      finalSeats = 1;
      if (!dto.maxWeightCapacityKg || dto.maxWeightCapacityKg > 15) {
        finalWeight = 15.0;
      }
    } else if (dto.type === VehicleType.mobil) {
      if (finalSeats < 1) finalSeats = 1;
      if (finalWeight < 10) finalWeight = 10;
    }

    const vehicle = await this.vehiclesRepository.create(userIdStr, {
      ...dto,
      capacitySeats: finalSeats,
      maxWeightCapacityKg: finalWeight,
    });

    return VehicleMapper.toResponse(vehicle);
  }

  async getMyVehicles(userIdStr: string) {
    const vehicles = await this.vehiclesRepository.findByUserId(userIdStr);
    return vehicles.map(VehicleMapper.toResponse);
  }

  async getVehicleById(idStr: string) {
    const vehicle = await this.vehiclesRepository.findById(idStr);
    if (!vehicle) {
      throw new NotFoundException('Data kendaraan tidak ditemukan.');
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
          'Nomor plat kendaraan sudah digunakan oleh kendaraan lain.',
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

  async deleteVehicle(idStr: string, userIdStr: string) {
    const vehicle = await this.vehiclesRepository.findById(idStr);
    if (!vehicle) {
      throw new NotFoundException('Data kendaraan tidak ditemukan.');
    }

    if (vehicle.userId.toString() !== userIdStr) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk menghapus kendaraan ini.',
      );
    }

    const activeTrips = await this.vehiclesRepository.countActiveTrips(idStr);
    if (activeTrips > 0) {
      throw new BadRequestException(
        'Kendaraan tidak dapat dihapus karena masih terikat pada perjalanan/trip yang aktif.',
      );
    }

    await this.vehiclesRepository.delete(idStr);
    return { message: 'Kendaraan berhasil dihapus.' };
  }
}
