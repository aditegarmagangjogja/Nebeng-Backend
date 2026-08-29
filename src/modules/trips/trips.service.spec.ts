import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { TripsService } from './trips.service';
import { TripsRepository } from './repository/trips.repository';
import { VehiclesRepository } from '../vehicles/repository/vehicles.repository';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  TripStatus,
  VehicleType,
  VerificationStatus,
} from '../../generated/prisma/enums';

describe('TripsService', () => {
  let service: TripsService;
  let tripsRepository: jest.Mocked<TripsRepository>;
  let vehiclesRepository: jest.Mocked<VehiclesRepository>;

  const mockUserStatus = {
    id: BigInt(10),
    role: 'mitra' as const,
    statusVerification: VerificationStatus.approved,
  };

  const mockVehicleMobil = {
    id: BigInt(1),
    userId: BigInt(10),
    type: VehicleType.mobil,
    model: 'Toyota Avanza',
    capacitySeats: 6,
    maxWeightCapacityKg: '100.00' as any,
  };

  const mockVehicleMotor = {
    id: BigInt(2),
    userId: BigInt(10),
    type: VehicleType.motor,
    model: 'Honda Vario',
    capacitySeats: 1,
    maxWeightCapacityKg: '15.00' as any,
  };

  const mockTrip = {
    id: BigInt(100),
    mitraId: BigInt(10),
    vehicleId: BigInt(1),
    originPointId: BigInt(5),
    destinationPointId: BigInt(6),
    vehicleType: VehicleType.mobil,
    departureDate: new Date('2026-09-01'),
    departureTime: new Date('2026-09-01T08:00:00Z'),
    price: '75000.00' as any,
    seatTotal: 6,
    seatAvailable: 6,
    maxWeightCapacityKg: '100.00' as any,
    remainingWeightCapacityKg: '100.00' as any,
    qrCodeTrip: 'TRIP-12345678',
    status: TripStatus.scheduled,
    createdAt: new Date(),
    updatedAt: new Date(),
    mitra: { id: BigInt(10), name: 'Mitra Test' },
    vehicle: mockVehicleMobil,
    originPoint: { id: BigInt(5), name: 'Pos Origin' },
    destinationPoint: { id: BigInt(6), name: 'Pos Destination' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockTripsRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByQrCode: jest.fn(),
      update: jest.fn(),
    };

    const mockVehiclesRepo = {
      findUserVerificationStatus: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        { provide: TripsRepository, useValue: mockTripsRepo },
        { provide: VehiclesRepository, useValue: mockVehiclesRepo },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    tripsRepository = module.get(
      TripsRepository,
    ) as jest.Mocked<TripsRepository>;
    vehiclesRepository = module.get(
      VehiclesRepository,
    ) as jest.Mocked<VehiclesRepository>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('createTrip (Pembuatan Jadwal Trip)', () => {
    it('harus berhasil membuat trip baru saat data dan otorisasi valid', async () => {
      const dto = {
        vehicleId: '1',
        originPointId: '5',
        destinationPointId: '6',
        departureDate: '2026-09-01',
        departureTime: '2026-09-01T08:00:00Z',
        price: 75000,
        totalSeats: 6,
        maxWeightCapacityKg: 100,
      };

      vehiclesRepository.findUserVerificationStatus.mockResolvedValue(
        mockUserStatus as any,
      );
      vehiclesRepository.findById.mockResolvedValue(mockVehicleMobil as any);
      tripsRepository.findByQrCode.mockResolvedValue(null);
      tripsRepository.create.mockResolvedValue(mockTrip as any);

      const result = await service.createTrip('10', 'approved', dto as any);

      expect(
        vehiclesRepository.findUserVerificationStatus,
      ).toHaveBeenCalledWith('10');
      expect(vehiclesRepository.findById).toHaveBeenCalledWith('1');
      expect(tripsRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.id).toEqual('100');
    });

    it('harus mengunci jumlah kursi menjadi 1 dan max bagasi 15kg jika armada bertipe MOTOR', async () => {
      const dto = {
        vehicleId: '2',
        originPointId: '5',
        destinationPointId: '6',
        departureDate: '2026-09-01',
        departureTime: '2026-09-01T08:00:00Z',
        price: 30000,
        totalSeats: 3, // Diinput 3, harus dikunci jadi 1
        maxWeightCapacityKg: 50, // Diinput > 15, harus dikunci jadi 15
      };

      vehiclesRepository.findUserVerificationStatus.mockResolvedValue(
        mockUserStatus as any,
      );
      vehiclesRepository.findById.mockResolvedValue(mockVehicleMotor as any);
      tripsRepository.findByQrCode.mockResolvedValue(null);
      tripsRepository.create.mockResolvedValue({
        ...mockTrip,
        vehicleType: VehicleType.motor,
        seatTotal: 1,
        seatAvailable: 1,
        maxWeightCapacityKg: '15.00' as any,
      } as any);

      await service.createTrip('10', 'approved', dto as any);

      expect(tripsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          seatTotal: 1,
          seatAvailable: 1,
          maxWeightCapacityKg: 15,
          remainingWeightCapacityKg: 15,
        }),
      );
    });

    it('harus melemparkan BadRequestException jika Pos Asal dan Pos Tujuan sama', async () => {
      const dto = {
        vehicleId: '1',
        originPointId: '5',
        destinationPointId: '5', // Pos Asal == Pos Tujuan
        departureDate: '2026-09-01',
        departureTime: '2026-09-01T08:00:00Z',
        price: 75000,
      };

      vehiclesRepository.findUserVerificationStatus.mockResolvedValue(
        mockUserStatus as any,
      );
      vehiclesRepository.findById.mockResolvedValue(mockVehicleMobil as any);

      await expect(
        service.createTrip('10', 'approved', dto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus melemparkan ForbiddenException jika kendaraan bukan milik Mitra yang sedang login', async () => {
      const dto = {
        vehicleId: '1',
        originPointId: '5',
        destinationPointId: '6',
        departureDate: '2026-09-01',
        departureTime: '2026-09-01T08:00:00Z',
        price: 75000,
      };

      vehiclesRepository.findUserVerificationStatus.mockResolvedValue(
        mockUserStatus as any,
      );
      vehiclesRepository.findById.mockResolvedValue({
        ...mockVehicleMobil,
        userId: BigInt(999), // Kendaraan milik user 999
      } as any);

      await expect(
        service.createTrip('10', 'approved', dto as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('harus melemparkan ForbiddenException jika status verifikasi Mitra bukan approved', async () => {
      const dto = {
        vehicleId: '1',
        originPointId: '5',
        destinationPointId: '6',
      };

      vehiclesRepository.findUserVerificationStatus.mockResolvedValue({
        ...mockUserStatus,
        statusVerification: VerificationStatus.pending,
      } as any);

      await expect(
        service.createTrip('10', 'pending', dto as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTrips (Pencarian & Listing Trip)', () => {
    it('harus mengembalikan daftar trip ter-filter', async () => {
      tripsRepository.findAll.mockResolvedValue([mockTrip] as any);

      const result = await service.getTrips({ originPointId: '5' } as any);

      expect(tripsRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ originPointId: BigInt(5) }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toEqual('100');
    });
  });

  describe('getTripById (Detail Trip Berdasarkan ID)', () => {
    it('harus mengembalikan data trip jika ID ditemukan', async () => {
      tripsRepository.findById.mockResolvedValue(mockTrip as any);

      const result = await service.getTripById('100');

      expect(tripsRepository.findById).toHaveBeenCalledWith('100');
      expect(result?.id).toEqual('100');
    });

    it('harus melemparkan NotFoundException jika trip tidak ditemukan', async () => {
      tripsRepository.findById.mockResolvedValue(null);

      await expect(service.getTripById('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTrip (Update Detail / Status Trip)', () => {
    it('harus berhasil mengupdate status trip saat pemiliknya valid', async () => {
      const dto = { status: TripStatus.in_transit };
      const updatedTrip = { ...mockTrip, status: TripStatus.in_transit };

      tripsRepository.findById.mockResolvedValue(mockTrip as any);
      tripsRepository.update.mockResolvedValue(updatedTrip as any);

      const result = await service.updateTrip('100', '10', dto as any);

      expect(tripsRepository.update).toHaveBeenCalledWith('100', {
        status: TripStatus.in_transit,
      });
      expect(result?.status).toEqual(TripStatus.in_transit);
    });

    it('harus melemparkan ForbiddenException jika mencoba mengedit trip milik Mitra lain', async () => {
      tripsRepository.findById.mockResolvedValue(mockTrip as any); // mitraId: 10

      await expect(
        service.updateTrip('100', '999', {
          status: TripStatus.cancelled,
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
