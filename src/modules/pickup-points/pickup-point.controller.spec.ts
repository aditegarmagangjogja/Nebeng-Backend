import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { PickupPointController } from './pickup-point.controller';
import { PickupPointService } from './pickup-point.service';
import { Role } from '../../generated/prisma/enums';

describe('PickupPointController', () => {
  let controller: PickupPointController;
  let service: jest.Mocked<PickupPointService>;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PickupPointController],
      providers: [{ provide: PickupPointService, useValue: mockService }],
    }).compile();

    controller = module.get<PickupPointController>(PickupPointController);
    service = module.get(PickupPointService) as jest.Mocked<PickupPointService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /pickup-points (Endpoint Tambah Pos Resmi)', () => {
    it('harus otomatis mengunci regionId ke wilayah admin jika role adalah admin_wilayah', async () => {
      const dto = {
        regionId: '1',
        cityId: '10',
        name: 'Pos Jombor',
        address: 'Jl. Magelang',
        latitude: -7.75,
        longitude: 110.36,
      };
      const expectedResponse = { id: '1000', ...dto } as any;

      service.create.mockResolvedValue(expectedResponse);

      const result = await controller.create(
        Role.admin_wilayah,
        'region-5',
        dto as any,
      );

      expect(dto.regionId).toEqual('region-5');
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /pickup-points (Endpoint Listing Pos Resmi)', () => {
    it('harus membatasi pencarian ke wilayah admin_wilayah jika diakses oleh admin wilayah', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(
        Role.admin_wilayah,
        'region-5',
        'region-1',
        '10',
        'true',
      );

      expect(service.findAll).toHaveBeenCalledWith('region-5', '10', true);
    });

    it('harus mengizinkan superadmin melihat pos di region manapun', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(
        Role.superadmin,
        'region-5',
        'region-1',
        '10',
        'false',
      );

      expect(service.findAll).toHaveBeenCalledWith('region-1', '10', false);
    });
  });

  describe('GET /pickup-points/:id (Endpoint Detail Pos Resmi)', () => {
    it('harus memanggil service.findOne dengan ID pos', async () => {
      const expectedResponse = { id: '1000', name: 'Pos Jombor' } as any;
      service.findOne.mockResolvedValue(expectedResponse);

      const result = await controller.findOne('1000');

      expect(service.findOne).toHaveBeenCalledWith('1000');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('PATCH /pickup-points/:id (Endpoint Update Pos Resmi)', () => {
    it('harus memanggil service.update dengan ID pos dan DTO', async () => {
      const dto = { name: 'Pos Jombor Update' };
      const expectedResponse = { id: '1000', name: 'Pos Jombor Update' } as any;

      service.update.mockResolvedValue(expectedResponse);

      const result = await controller.update('1000', dto as any);

      expect(service.update).toHaveBeenCalledWith('1000', dto);
      expect(result).toEqual(expectedResponse);
    });
  });
});
