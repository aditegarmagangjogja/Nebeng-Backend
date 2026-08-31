import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TripsRepository } from './repository/trips.repository';
import { VehiclesRepository } from '../vehicles/repository/vehicles.repository';
import { CreateTripDto } from './dto/create-trip.dto';
import { QueryTripDto } from './dto/query-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripMapper } from './mappers/trip.mapper';
import {
  TripStatus,
  VehicleType,
  VerificationStatus,
} from '../../generated/prisma/enums';
import { randomBytes } from 'crypto';

@Injectable()
export class TripsService {
  constructor(
    private readonly tripsRepository: TripsRepository,
    private readonly vehiclesRepository: VehiclesRepository,
  ) {}

  private async generateUniqueTripQr(): Promise<string> {
    let qrCodeTrip = '';
    let isUnique = false;

    while (!isUnique) {
      const hex = randomBytes(4).toString('hex').toUpperCase();
      qrCodeTrip = `TRIP-${hex}`;
      const existing = await this.tripsRepository.findByQrCode(qrCodeTrip);
      if (!existing) {
        isUnique = true;
      }
    }

    return qrCodeTrip;
  }

  private safeParseBigInt(id: string): bigint {
    try {
      return BigInt(id);
    } catch {
      throw new BadRequestException('Format ID tidak valid');
    }
  }

  async createTrip(userIdStr: string, dto: CreateTripDto) {
    const parsedUserId: string = userIdStr;
    if (!parsedUserId || parsedUserId === 'undefined') {
      throw new ForbiddenException(
        'Sesi user tidak valid. Silakan login kembali.',
      );
    }

    const user =
      await this.vehiclesRepository.findUserVerificationStatus(parsedUserId);

    if (!user) {
      throw new NotFoundException(
        `User dengan ID ${parsedUserId} tidak ditemukan.`,
      );
    }

    if (user.statusVerification !== VerificationStatus.approved) {
      throw new ForbiddenException(
        'Hanya Mitra terverifikasi (approved) yang dapat membuat jadwal trip.',
      );
    }

    const vehicle = await this.vehiclesRepository.findById(dto.vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Kendaraan tidak ditemukan.');
    }

    if (vehicle.userId.toString() !== parsedUserId) {
      throw new ForbiddenException('Kendaraan ini bukan milik Anda.');
    }

    if (dto.originPointId === dto.destinationPointId) {
      throw new BadRequestException(
        'Pos Asal dan Pos Tujuan tidak boleh sama.',
      );
    }

    const parsedVehicleId = this.safeParseBigInt(dto.vehicleId);
    const targetDepartureDate = new Date(dto.departureDate);

    const conflictingTrip = await this.tripsRepository.findConflictingTrip(
      parsedVehicleId,
      targetDepartureDate,
    );

    if (conflictingTrip) {
      throw new BadRequestException(
        'Kendaraan ini sudah dijadwalkan pada trip lain di tanggal yang sama. Satu kendaraan tidak dapat digunakan untuk dua perjalanan bersamaan.',
      );
    }

    let seatTotal = dto.totalSeats ?? vehicle.capacitySeats;
    let maxWeightKg =
      dto.maxWeightCapacityKg ?? Number(vehicle.maxWeightCapacityKg);

    if (vehicle.type === VehicleType.motor) {
      seatTotal = 1;
      if (maxWeightKg > 15) {
        maxWeightKg = 15.0;
      }
    }

    const qrCodeTrip = await this.generateUniqueTripQr();

    const tripData = {
      mitraId: this.safeParseBigInt(parsedUserId),
      vehicleId: parsedVehicleId,
      originPointId: this.safeParseBigInt(dto.originPointId),
      destinationPointId: this.safeParseBigInt(dto.destinationPointId),
      vehicleType: vehicle.type,
      departureDate: targetDepartureDate,
      departureTime: new Date(dto.departureTime),
      price: dto.price,
      seatTotal,
      seatAvailable: seatTotal,
      maxWeightCapacityKg: maxWeightKg,
      remainingWeightCapacityKg: maxWeightKg,
      qrCodeTrip,
      status: TripStatus.scheduled,
    };

    const trip = await this.tripsRepository.create(tripData);
    return TripMapper.toResponse(trip);
  }

  async getTrips(query: QueryTripDto) {
    const filters: any = {};

    if (query.originPointId) {
      filters.originPointId = this.safeParseBigInt(query.originPointId);
    }
    if (query.destinationPointId) {
      filters.destinationPointId = this.safeParseBigInt(
        query.destinationPointId,
      );
    }
    if (query.status) {
      filters.status = query.status;
    }
    if (query.vehicleType) {
      filters.vehicleType = query.vehicleType;
    }
    if (query.date) {
      filters.departureDate = new Date(query.date);
    }

    const trips = await this.tripsRepository.findAll(filters);
    return TripMapper.toResponseList(trips);
  }

  async getTripById(idStr: string) {
    const trip = await this.tripsRepository.findById(idStr);
    if (!trip) {
      throw new NotFoundException('Trip tidak ditemukan.');
    }
    return TripMapper.toResponse(trip);
  }

  async updateTrip(idStr: string, userIdStr: string, dto: UpdateTripDto) {
    const trip = await this.tripsRepository.findById(idStr);
    if (!trip) {
      throw new NotFoundException('Trip tidak ditemukan.');
    }

    if (trip.mitraId.toString() !== userIdStr) {
      throw new ForbiddenException(
        'Anda tidak berhak mengubah trip orang lain.',
      );
    }

    const updateData: any = {};

    if (dto.status) {
      if (
        dto.status === TripStatus.in_transit ||
        dto.status === TripStatus.completed ||
        dto.status === TripStatus.arrived_dest_pos
      ) {
        throw new BadRequestException(
          'Perubahan status Trip menjadi In-Transit atau Completed hanya dapat dilakukan via QR Checkpoint Scanner Operator Pos.',
        );
      }
      updateData.status = dto.status;
    }

    if (dto.departureDate) {
      updateData.departureDate = new Date(dto.departureDate);
    }
    if (dto.departureTime) {
      updateData.departureTime = new Date(dto.departureTime);
    }

    const updated = await this.tripsRepository.update(idStr, updateData);
    return TripMapper.toResponse(updated);
  }
}
