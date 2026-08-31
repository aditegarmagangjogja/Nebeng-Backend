import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TrackingRepository } from './tracking.repository';
import { UpdateLocationDto } from './dto/update-location.dto';
import { TripStatus } from '../../generated/prisma/enums';

@Injectable()
export class TrackingService {
  constructor(private readonly trackingRepository: TrackingRepository) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async validateAndSaveLocation(
    mitraUserIdStr: string,
    dto: UpdateLocationDto,
  ) {
    const trip = await this.trackingRepository.findTripById(dto.tripId);
    if (!trip) {
      throw new NotFoundException('Jadwal Trip tidak ditemukan.');
    }

    if (trip.mitraId.toString() !== mitraUserIdStr) {
      throw new ForbiddenException(
        'Anda tidak berhak memperbarui lokasi pada trip orang lain.',
      );
    }

    if (trip.status !== TripStatus.in_transit) {
      throw new BadRequestException(
        'Pencatatan lokasi hanya dapat dilakukan saat status Trip IN_TRANSIT.',
      );
    }

    const tripBigIntId = BigInt(dto.tripId);
    const longitude = dto.longtitude ?? (dto as any).longtitude;

    return this.trackingRepository.createTrackingLog(
      tripBigIntId,
      dto.latitude,
      longitude,
    );
  }

  async getTripHistory(tripId: string) {
    const tripBigIntId = this.safeParseBigInt(tripId);
    if (!tripBigIntId) {
      throw new BadRequestException('Format ID Trip tidak valid');
    }

    const logs =
      await this.trackingRepository.getRecentTrackingLogs(tripBigIntId);

    return logs.map((log) => ({
      id: log.id.toString(),
      tripId: log.tripId.toString(),
      latitude: Number(log.latitude),
      longitude: Number(log.longitude),
      recordedAt: log.recordedAt.toISOString(),
    }));
  }
}
