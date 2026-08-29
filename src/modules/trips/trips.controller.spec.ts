import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { TripStatus } from '../../generated/prisma/enums';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

describe('TripsController', () => {
  let controller: TripsController;
  let tripsService: jest.Mocked<TripsService>;

  beforeEach(async () => {
    const mockService = {
      createTrip: jest.fn(),
      getTrips: jest.fn(),
      getTripById: jest.fn(),
      updateTrip: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripsController],
      providers: [{ provide: TripsService, useValue: mockService }],
    }).compile();

    controller = module.get<TripsController>(TripsController);
    tripsService = module.get(TripsService) as jest.Mocked<TripsService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /trips (Endpoint Buat Jadwal Trip)', () => {
    it('harus memanggil tripsService.createTrip dengan ID Mitra, status verifikasi, dan DTO lengkap', async () => {
      const user = { id: '10', statusVerification: 'approved' };
      const dto: CreateTripDto = {
        vehicleId: '1',
        originPointId: '5',
        destinationPointId: '6',
        departureDate: '2026-09-01',
        departureTime: '2026-09-01T08:00:00Z',
        price: 75000,
      };
      const expectedResponse = { id: '100', ...dto } as any;

      tripsService.createTrip.mockResolvedValue(expectedResponse);

      const result = await controller.createTrip(user, dto);

      expect(tripsService.createTrip).toHaveBeenCalledWith(
        '10',
        'approved',
        dto,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /trips (Endpoint Listing Trip)', () => {
    it('harus memanggil tripsService.getTrips dengan query filter', async () => {
      const query = { originPointId: '5' };
      tripsService.getTrips.mockResolvedValue([]);

      const result = await controller.getTrips(query as any);

      expect(tripsService.getTrips).toHaveBeenCalledWith(query);
      expect(result).toEqual([]);
    });
  });

  describe('GET /trips/:id (Endpoint Detail Trip)', () => {
    it('harus memanggil tripsService.getTripById dengan ID trip', async () => {
      const expectedResponse = { id: '100', price: 75000 } as any;
      tripsService.getTripById.mockResolvedValue(expectedResponse);

      const result = await controller.getTripById('100');

      expect(tripsService.getTripById).toHaveBeenCalledWith('100');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('PATCH /trips/:id (Endpoint Update Status Trip)', () => {
    it('harus memanggil tripsService.updateTrip dengan ID trip, userId Mitra, dan DTO', async () => {
      const dto: UpdateTripDto = { status: TripStatus.in_transit };
      const expectedResponse = {
        id: '100',
        status: TripStatus.in_transit,
      } as any;

      tripsService.updateTrip.mockResolvedValue(expectedResponse);

      const result = await controller.updateTrip('100', '10', dto);

      expect(tripsService.updateTrip).toHaveBeenCalledWith('100', '10', dto);
      expect(result).toEqual(expectedResponse);
    });
  });
});
