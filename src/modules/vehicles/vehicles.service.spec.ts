import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { VehicleService } from './vehicles.service';
import { VehiclesRepository } from './repository/vehicles.repository';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { VehicleType, VerificationStatus } from '../../generated/prisma/enums';

describe('VehicleService', () => {
  let service: VehicleService;
  let repository: jest.Mocked<VehiclesRepository>;

  const mockUserStatus = {
    id: BigInt(10),
    role: 'mitra' as const,
    statusVerification: VerificationStatus.approved,
  };

  const mockVehicle = {
    id: BigInt(1),
    userId: BigInt(10),
    type: VehicleType.mobil,
    model: 'Toyota Avanza',
    plateNumber: 'B1234XYZ',
    color: 'Hitam',
    capacitySeats: 6,
    maxWeightCapacityKg: '100.00' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
      findUserVerificationStatus: jest.fn(),
      findByPlateNumber: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        { provide: VehiclesRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
    repository = module.get(
      VehiclesRepository,
    ) as jest.Mocked<VehiclesRepository>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('createVehicle (Pendaftaran Kendaraan Baru)', () => {
    it('harus berhasil membuat kendaraan jenis mobil jika status verifikasi user APPROVED', async () => {
      const dto = {
        type: VehicleType.mobil,
        model: 'Toyota Avanza',
        plateNumber: 'B 1234 XYZ',
        color: 'Hitam',
        capacitySeats: 6,
        maxWeightCapacityKg: 100,
      };

      repository.findUserVerificationStatus.mockResolvedValue(
        mockUserStatus as any,
      );
      repository.findByPlateNumber.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockVehicle as any);

      const result = await service.createVehicle('10', dto);

      expect(repository.findUserVerificationStatus).toHaveBeenCalledWith('10');
      expect(repository.findByPlateNumber).toHaveBeenCalledWith('B1234XYZ');
      expect(repository.create).toHaveBeenCalledWith('10', {
        ...dto,
        capacitySeats: 6,
        maxWeightCapacityKg: 100,
      });
      expect(result).toBeDefined();
      expect(result?.id).toEqual('1');
    });

    it('harus mengunci jumlah kursi menjadi 1 dan max beban 15kg jika tipe kendaraan adalah MOTOR', async () => {
      const dto = {
        type: VehicleType.motor,
        model: 'Honda Vario',
        plateNumber: 'AB 9999 CD',
        color: 'Merah',
        capacitySeats: 2, // Diinput 2, harus dikunci jadi 1
        maxWeightCapacityKg: 50, // Diinput > 15, harus dikunci jadi 15
      };

      const mockMotor = {
        ...mockVehicle,
        type: VehicleType.motor,
        capacitySeats: 1,
        maxWeightCapacityKg: '15.00' as any,
      };

      repository.findUserVerificationStatus.mockResolvedValue(
        mockUserStatus as any,
      );
      repository.findByPlateNumber.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockMotor as any);

      await service.createVehicle('10', dto);

      expect(repository.create).toHaveBeenCalledWith('10', {
        ...dto,
        capacitySeats: 1,
        maxWeightCapacityKg: 15.0,
      });
    });

    it('harus melemparkan ForbiddenException jika status verifikasi akun pengguna belum APPROVED', async () => {
      repository.findUserVerificationStatus.mockResolvedValue({
        ...mockUserStatus,
        statusVerification: VerificationStatus.pending,
      } as any);

      await expect(
        service.createVehicle('10', {
          type: VehicleType.mobil,
          model: 'Mobil',
          plateNumber: 'B1234XYZ',
          color: 'Hitam',
          capacitySeats: 4,
          maxWeightCapacityKg: 50,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('harus melemparkan BadRequestException jika plat nomor sudah terdaftar di sistem', async () => {
      repository.findUserVerificationStatus.mockResolvedValue(
        mockUserStatus as any,
      );
      repository.findByPlateNumber.mockResolvedValue(mockVehicle as any);

      await expect(
        service.createVehicle('10', {
          type: VehicleType.mobil,
          model: 'Mobil',
          plateNumber: 'B 1234 XYZ',
          color: 'Hitam',
          capacitySeats: 4,
          maxWeightCapacityKg: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyVehicles (Daftar Kendaraan Milik Saya)', () => {
    it('harus mengembalikan daftar kendaraan mitra yang sudah ter-map', async () => {
      repository.findByUserId.mockResolvedValue([mockVehicle] as any);

      const result = await service.getMyVehicles('10');

      expect(repository.findByUserId).toHaveBeenCalledWith('10');
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toEqual('1');
    });
  });

  describe('getVehicleById (Pencarian Kendaraan Berdasarkan ID)', () => {
    it('harus mengembalikan detail kendaraan jika ID ditemukan', async () => {
      repository.findById.mockResolvedValue(mockVehicle as any);

      const result = await service.getVehicleById('1');

      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(result?.id).toEqual('1');
    });

    it('harus melemparkan NotFoundException jika data kendaraan tidak ditemukan', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getVehicleById('99')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateVehicle (Pembaruan Data Kendaraan)', () => {
    it('harus berhasil memperbarui kendaraan saat pemiliknya valid', async () => {
      const dto = { model: 'Toyota Avanza Veloz' };
      const updatedVehicle = { ...mockVehicle, model: 'Toyota Avanza Veloz' };

      repository.findById.mockResolvedValue(mockVehicle as any);
      repository.update.mockResolvedValue(updatedVehicle as any);

      const result = await service.updateVehicle('1', '10', dto);

      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(repository.update).toHaveBeenCalledWith('1', {
        ...dto,
      });
      expect(result?.model).toEqual('Toyota Avanza Veloz');
    });

    it('harus melemparkan NotFoundException jika kendaraan tidak ada', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateVehicle('99', '10', { model: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus melemparkan ForbiddenException jika user mencoba mengedit kendaraan milik orang lain', async () => {
      repository.findById.mockResolvedValue(mockVehicle as any);

      await expect(
        service.updateVehicle('1', '999', { model: 'Test' }), // User 999 bukan pemilik (userId: 10)
      ).rejects.toThrow(ForbiddenException);
    });

    it('harus melemparkan ConflictException jika memperbarui plat nomor ke plat yang sudah dipakai kendaraan lain', async () => {
      const otherVehicle = {
        ...mockVehicle,
        id: BigInt(2),
        plateNumber: 'B8888BBB',
      };

      repository.findById.mockResolvedValue(mockVehicle as any);
      repository.findByPlateNumber.mockResolvedValue(otherVehicle as any);

      await expect(
        service.updateVehicle('1', '10', { plateNumber: 'B 8888 BBB' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
