import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { TrackingService } from './tracking.service';
import { TrackingRepository } from './tracking.repository';

describe('TrackingService', () => {
  let service: TrackingService;
  let repository: jest.Mocked<TrackingRepository>;

  const mockLog = {
    id: BigInt(1),
    tripId: BigInt(100),
    latitude: -7.7956,
    longitude: 110.3695,
    recordedAt: new Date('2026-08-25T10:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      createTrackingLog: jest.fn(),
      getRecentTrackingLogs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: TrackingRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
    repository = module.get(
      TrackingRepository,
    ) as jest.Mocked<TrackingRepository>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('saveLocation (Menyimpan Koordinat Tracking Baru)', () => {
    it('harus berhasil mengonversi tripId ke BigInt dan menyimpan log lokasi', async () => {
      const dto = {
        tripId: '100',
        latitude: -7.7956,
        longtitude: 110.3695,
      };

      repository.createTrackingLog.mockResolvedValue(mockLog as any);

      const result = await service.saveLocation(dto);

      expect(repository.createTrackingLog).toHaveBeenCalledWith(
        BigInt(100),
        -7.7956,
        110.3695,
      );
      expect(result).toEqual(mockLog);
    });
  });

  describe('getTripHistory (Mengambil Riwayat Perjalanan)', () => {
    it('harus mengembalikan riwayat lokasi yang terkonversi aman ke string dan ISO Date', async () => {
      repository.getRecentTrackingLogs.mockResolvedValue([mockLog] as any);

      const result = await service.getTripHistory('100');

      expect(repository.getRecentTrackingLogs).toHaveBeenCalledWith(
        BigInt(100),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        tripId: '100',
        latitude: -7.7956,
        longitude: 110.3695,
        recordedAt: '2026-08-25T10:00:00.000Z',
      });
    });
  });
});
