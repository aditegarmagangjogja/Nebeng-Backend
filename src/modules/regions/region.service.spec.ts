import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { RegionService } from './region.service';
import { RegionRepository } from './repositories/region.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('RegionService', () => {
  let service: RegionService;
  let repository: jest.Mocked<RegionRepository>;

  const mockRegion = {
    id: BigInt(1),
    name: 'Yogyakarta',
    code: 'YOG',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCity = {
    id: BigInt(10),
    name: 'Sleman',
    province: 'DI Yogyakarta',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRegionRepository = {
      createRegion: jest.fn(),
      findRegionById: jest.fn(),
      findRegionByCode: jest.fn(),
      findAllRegions: jest.fn(),
      updateRegion: jest.fn(),
      createCity: jest.fn(),
      findCityByNameAndProvince: jest.fn(),
      findAllCities: jest.fn(),
      findCityById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegionService,
        { provide: RegionRepository, useValue: mockRegionRepository },
      ],
    }).compile();

    service = module.get<RegionService>(RegionService);
    repository = module.get(RegionRepository) as jest.Mocked<RegionRepository>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('createRegion (Pembuatan Region Baru)', () => {
    it('harus berhasil membuat dan mengembalikan data Region saat kode belum terdaftar', async () => {
      const dto = { name: 'Yogyakarta', code: 'YOG' };

      repository.findRegionByCode.mockResolvedValue(null);
      repository.createRegion.mockResolvedValue(mockRegion as any);

      const result = await service.createRegion(dto);

      expect(repository.findRegionByCode).toHaveBeenCalledWith('YOG');
      expect(repository.createRegion).toHaveBeenCalledWith(dto);
      expect(result?.id).toEqual('1');
      expect(result?.code).toEqual('YOG');
    });

    it('harus melemparkan ConflictException jika kode Region sudah terdaftar', async () => {
      const dto = { name: 'Yogyakarta', code: 'YOG' };
      repository.findRegionByCode.mockResolvedValue(mockRegion as any);

      await expect(service.createRegion(dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getAllRegions (Mengambil Daftar Seluruh Region)', () => {
    it('harus mengembalikan daftar Region terformat', async () => {
      repository.findAllRegions.mockResolvedValue([mockRegion] as any);

      const result = await service.getAllRegions(false);

      expect(repository.findAllRegions).toHaveBeenCalledWith(false);
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toEqual('1');
    });
  });

  describe('getRegionById (Pencarian Region Berdasarkan ID)', () => {
    it('harus mengembalikan detail Region saat ID ditemukan', async () => {
      repository.findRegionById.mockResolvedValue(mockRegion as any);

      const result = await service.getRegionById('1');

      expect(repository.findRegionById).toHaveBeenCalledWith('1');
      expect(result?.id).toEqual('1');
    });

    it('harus melemparkan NotFoundException jika Region tidak ditemukan', async () => {
      repository.findRegionById.mockResolvedValue(null);

      await expect(service.getRegionById('99')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRegion (Pembaruan Data Region)', () => {
    it('harus berhasil memperbarui Region saat ID dan data valid', async () => {
      const dto = { name: 'Yogyakarta Update', isActive: false };
      const updatedRegion = {
        ...mockRegion,
        name: 'Yogyakarta Update',
        isActive: false,
      };

      repository.findRegionById.mockResolvedValue(mockRegion as any);
      repository.updateRegion.mockResolvedValue(updatedRegion as any);

      const result = await service.updateRegion('1', dto);

      expect(repository.findRegionById).toHaveBeenCalledWith('1');
      expect(repository.updateRegion).toHaveBeenCalledWith('1', dto);
      expect(result?.name).toEqual('Yogyakarta Update');
    });

    it('harus melemparkan NotFoundException jika Region yang akan diperbarui tidak ada', async () => {
      repository.findRegionById.mockResolvedValue(null);

      await expect(
        service.updateRegion('99', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus melemparkan ConflictException jika mengubah kode Region ke kode yang sudah digunakan Region lain', async () => {
      const dto = { code: 'SOLO' };
      const existingOtherRegion = {
        ...mockRegion,
        id: BigInt(2),
        code: 'SOLO',
      };

      repository.findRegionById.mockResolvedValue(mockRegion as any);
      repository.findRegionByCode.mockResolvedValue(existingOtherRegion as any);

      await expect(service.updateRegion('1', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('createCity (Pembuatan Kota Baru)', () => {
    it('harus berhasil membuat Kota jika nama dan provinsi belum ada', async () => {
      const dto = { name: 'Sleman', province: 'DI Yogyakarta' };

      repository.findCityByNameAndProvince.mockResolvedValue(null);
      repository.createCity.mockResolvedValue(mockCity as any);

      const result = await service.createCity(dto);

      expect(repository.findCityByNameAndProvince).toHaveBeenCalledWith(
        'Sleman',
        'DI Yogyakarta',
      );
      expect(repository.createCity).toHaveBeenCalledWith(dto);
      expect(result?.id).toEqual('10');
    });

    it('harus melemparkan ConflictException jika Kota dan Provinsi sudah terdaftar', async () => {
      const dto = { name: 'Sleman', province: 'DI Yogyakarta' };
      repository.findCityByNameAndProvince.mockResolvedValue(mockCity as any);

      await expect(service.createCity(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getAllCities (Mengambil Daftar Seluruh Kota)', () => {
    it('harus mengembalikan seluruh daftar Kota yang terdaftar', async () => {
      repository.findAllCities.mockResolvedValue([mockCity] as any);

      const result = await service.getAllCities();

      expect(repository.findAllCities).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toEqual('Sleman');
    });
  });
});
