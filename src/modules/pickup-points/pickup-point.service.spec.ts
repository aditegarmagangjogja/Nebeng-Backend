import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { PickupPointService } from './pickup-point.service';
import { PickupPointRepository } from './repository/pickup-point.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '../../generated/prisma/enums';

describe('PickupPointService', () => {
  let service: PickupPointService;
  let repository: jest.Mocked<PickupPointRepository>;

  const mockRegion = { id: BigInt(1), name: 'Yogyakarta', code: 'YOG' };
  const mockCity = {
    id: BigInt(10),
    name: 'Sleman',
    province: 'DI Yogyakarta',
  };
  const mockOperatorUser = {
    id: BigInt(100),
    role: Role.operator_pos,
    status: 'active',
  };

  const mockPos = {
    id: BigInt(1000),
    regionId: BigInt(1),
    cityId: BigInt(10),
    operatorId: BigInt(100),
    name: 'Pos Terminal Jombor',
    address: 'Jl. Magelang KM 6',
    latitude: -7.7505,
    longitude: 110.3601,
    qrCodePos: 'POS-12345678',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    region: mockRegion,
    city: mockCity,
    operator: mockOperatorUser,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByQrCode: jest.fn(),
      findUserById: jest.fn(),
      findRegionById: jest.fn(),
      findCityById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PickupPointService,
        { provide: PickupPointRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<PickupPointService>(PickupPointService);
    repository = module.get(
      PickupPointRepository,
    ) as jest.Mocked<PickupPointRepository>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('create (Pembuatan Pickup Point / Pos Resmi)', () => {
    it('harus berhasil membuat pos baru jika region, city, dan operator valid', async () => {
      const dto = {
        regionId: '1',
        cityId: '10',
        operatorId: '100',
        name: 'Pos Terminal Jombor',
        address: 'Jl. Magelang KM 6',
        latitude: -7.7505,
        longitude: 110.3601,
      };

      repository.findRegionById.mockResolvedValue(mockRegion as any);
      repository.findCityById.mockResolvedValue(mockCity as any);
      repository.findUserById.mockResolvedValue(mockOperatorUser as any);
      repository.findByQrCode.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockPos as any);

      const result = await service.create(dto);

      expect(repository.findRegionById).toHaveBeenCalledWith('1');
      expect(repository.findCityById).toHaveBeenCalledWith('10');
      expect(repository.findUserById).toHaveBeenCalledWith('100');
      expect(repository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.id).toEqual('1000');
    });

    it('harus melemparkan NotFoundException jika Region ID tidak ditemukan di database', async () => {
      const dto = {
        regionId: '99',
        cityId: '10',
        name: 'Pos A',
        address: 'Alamat A',
        latitude: 0,
        longitude: 0,
      };

      repository.findRegionById.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('harus melemparkan NotFoundException jika City ID tidak ditemukan di database', async () => {
      const dto = {
        regionId: '1',
        cityId: '99',
        name: 'Pos A',
        address: 'Alamat A',
        latitude: 0,
        longitude: 0,
      };

      repository.findRegionById.mockResolvedValue(mockRegion as any);
      repository.findCityById.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('harus melemparkan BadRequestException jika user operator yang dipilih bukan ber-role operator_pos', async () => {
      const dto = {
        regionId: '1',
        cityId: '10',
        operatorId: '200',
        name: 'Pos Terminal Jombor',
        address: 'Jl. Magelang KM 6',
        latitude: -7.7505,
        longitude: 110.3601,
      };

      repository.findRegionById.mockResolvedValue(mockRegion as any);
      repository.findCityById.mockResolvedValue(mockCity as any);
      repository.findUserById.mockResolvedValue({
        id: BigInt(200),
        role: Role.customer, // Role bukan operator_pos
        status: 'active',
      } as any);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll (Mengambil Seluruh Pos Resmi)', () => {
    it('harus mengembalikan daftar pos resmi terformat', async () => {
      repository.findAll.mockResolvedValue([mockPos] as any);

      const result = await service.findAll('1', '10', true);

      expect(repository.findAll).toHaveBeenCalledWith('1', '10', true);
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toEqual('1000');
    });
  });

  describe('findOne (Detail Pos Resmi Berdasarkan ID)', () => {
    it('harus mengembalikan data pos jika ID ditemukan', async () => {
      repository.findById.mockResolvedValue(mockPos as any);

      const result = await service.findOne('1000');

      expect(repository.findById).toHaveBeenCalledWith('1000');
      expect(result?.id).toEqual('1000');
    });

    it('harus melemparkan NotFoundException jika pos tidak ditemukan', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('9999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update (Pembaruan Pos Resmi)', () => {
    it('harus berhasil memperbarui data pos jika ID dan data valid', async () => {
      const dto = { name: 'Pos Terminal Jombor Baru' };
      const updatedPos = { ...mockPos, name: 'Pos Terminal Jombor Baru' };

      repository.findById.mockResolvedValue(mockPos as any);
      repository.update.mockResolvedValue(updatedPos as any);

      const result = await service.update('1000', dto);

      expect(repository.findById).toHaveBeenCalledWith('1000');
      expect(repository.update).toHaveBeenCalledWith(
        '1000',
        expect.objectContaining({ name: 'Pos Terminal Jombor Baru' }),
      );
      expect(result?.name).toEqual('Pos Terminal Jombor Baru');
    });

    it('harus melemparkan NotFoundException jika pos yang akan di-update tidak ditemukan', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('9999', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
