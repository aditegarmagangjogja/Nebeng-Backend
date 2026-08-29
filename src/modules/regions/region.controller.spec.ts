import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { RegionController } from './region.controller';
import { RegionService } from './region.service';

describe('RegionController', () => {
  let controller: RegionController;
  let regionService: jest.Mocked<RegionService>;

  beforeEach(async () => {
    const mockRegionService = {
      createRegion: jest.fn(),
      getAllRegions: jest.fn(),
      getRegionById: jest.fn(),
      updateRegion: jest.fn(),
      createCity: jest.fn(),
      getAllCities: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegionController],
      providers: [{ provide: RegionService, useValue: mockRegionService }],
    }).compile();

    controller = module.get<RegionController>(RegionController);
    regionService = module.get(RegionService) as jest.Mocked<RegionService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /regions (Endpoint Tambah Region)', () => {
    it('harus memanggil regionService.createRegion dengan DTO yang benar', async () => {
      const dto = { name: 'Yogyakarta', code: 'YOG' };
      const expectedResponse = { id: '1', ...dto, isActive: true } as any;

      regionService.createRegion.mockResolvedValue(expectedResponse);

      const result = await controller.createRegion(dto);

      expect(regionService.createRegion).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /regions (Endpoint Daftar Region)', () => {
    it('harus mengonversi query parameter onlyActive "true" menjadi boolean true', async () => {
      regionService.getAllRegions.mockResolvedValue([]);

      await controller.findAllRegions('true');

      expect(regionService.getAllRegions).toHaveBeenCalledWith(true);
    });

    it('harus mengonversi query parameter undefined/kosong menjadi boolean false', async () => {
      regionService.getAllRegions.mockResolvedValue([]);

      await controller.findAllRegions(undefined);

      expect(regionService.getAllRegions).toHaveBeenCalledWith(false);
    });
  });

  describe('GET /regions/:id (Endpoint Detail Region)', () => {
    it('harus memanggil regionService.getRegionById dengan ID yang sesuai', async () => {
      const expectedResponse = {
        id: '1',
        name: 'Yogyakarta',
        code: 'YOG',
      } as any;
      regionService.getRegionById.mockResolvedValue(expectedResponse);

      const result = await controller.findOneRegion('1');

      expect(regionService.getRegionById).toHaveBeenCalledWith('1');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('PATCH /regions/:id (Endpoint Update Region)', () => {
    it('harus memanggil regionService.updateRegion dengan ID dan DTO yang sesuai', async () => {
      const dto = { name: 'Yogyakarta Baru' };
      const expectedResponse = {
        id: '1',
        name: 'Yogyakarta Baru',
        code: 'YOG',
      } as any;

      regionService.updateRegion.mockResolvedValue(expectedResponse);

      const result = await controller.updateRegion('1', dto);

      expect(regionService.updateRegion).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('POST /cities (Endpoint Tambah Kota)', () => {
    it('harus memanggil regionService.createCity dengan DTO Kota', async () => {
      const dto = { name: 'Sleman', province: 'DI Yogyakarta' };
      const expectedResponse = { id: '10', ...dto } as any;

      regionService.createCity.mockResolvedValue(expectedResponse);

      const result = await controller.createCity(dto);

      expect(regionService.createCity).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /cities (Endpoint Daftar Kota)', () => {
    it('harus memanggil regionService.getAllCities', async () => {
      regionService.getAllCities.mockResolvedValue([]);

      const result = await controller.findAllCities();

      expect(regionService.getAllCities).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
