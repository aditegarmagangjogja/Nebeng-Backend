import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { VehiclesController } from './vehicles.controller';
import { VehicleService } from './vehicles.service';
import { VehicleType } from '../../generated/prisma/enums';

describe('VehiclesController', () => {
  let controller: VehiclesController;
  let vehicleService: jest.Mocked<VehicleService>;

  beforeEach(async () => {
    const mockService = {
      createVehicle: jest.fn(),
      getMyVehicles: jest.fn(),
      getVehicleById: jest.fn(),
      updateVehicle: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [{ provide: VehicleService, useValue: mockService }],
    }).compile();

    controller = module.get<VehiclesController>(VehiclesController);
    vehicleService = module.get(VehicleService) as jest.Mocked<VehicleService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /vehicles', () => {
    it('harus memanggil vehicleService.createVehicle dengan userId dan DTO', async () => {
      const dto = {
        type: VehicleType.mobil,
        model: 'Toyota Avanza',
        plateNumber: 'B1234XYZ',
        color: 'Hitam',
        capacitySeats: 6,
        maxWeightCapacityKg: 100,
      };
      const expectedResponse = { id: '1', ...dto } as any;

      vehicleService.createVehicle.mockResolvedValue(expectedResponse);

      const result = await controller.createVehicle('10', dto as any);

      expect(vehicleService.createVehicle).toHaveBeenCalledWith('10', dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /vehicles/me', () => {
    it('harus memanggil vehicleService.getMyVehicles dengan userId', async () => {
      vehicleService.getMyVehicles.mockResolvedValue([]);

      const result = await controller.getMyVehicles('10');

      expect(vehicleService.getMyVehicles).toHaveBeenCalledWith('10');
      expect(result).toEqual([]);
    });
  });

  describe('GET /vehicles/:id', () => {
    it('harus memanggil vehicleService.getVehicleById dengan ID kendaraan', async () => {
      const expectedResponse = { id: '1', model: 'Toyota Avanza' } as any;
      vehicleService.getVehicleById.mockResolvedValue(expectedResponse);

      const result = await controller.getVehicleById('1');

      expect(vehicleService.getVehicleById).toHaveBeenCalledWith('1');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('PATCH /vehicles/:id', () => {
    it('harus memanggil vehicleService.updateVehicle dengan ID kendaraan, userId, dan DTO', async () => {
      const dto = { model: 'Toyota Avanza Veloz' };
      const expectedResponse = { id: '1', model: 'Toyota Avanza Veloz' } as any;

      vehicleService.updateVehicle.mockResolvedValue(expectedResponse);

      const result = await controller.updateVehicle('1', '10', dto);

      expect(vehicleService.updateVehicle).toHaveBeenCalledWith('1', '10', dto);
      expect(result).toEqual(expectedResponse);
    });
  });
});
