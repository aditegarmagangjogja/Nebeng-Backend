import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { CheckpointsController } from './checkpoints.controller';
import { CheckpointsService } from './checkpoints.service';
import { ScanType } from '../../generated/prisma/enums';

describe('CheckpointsController', () => {
  let controller: CheckpointsController;
  let checkpointsService: jest.Mocked<CheckpointsService>;

  beforeEach(async () => {
    const mockService = {
      scanCheckpoint: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckpointsController],
      providers: [{ provide: CheckpointsService, useValue: mockService }],
    }).compile();

    controller = module.get<CheckpointsController>(CheckpointsController);
    checkpointsService = module.get(
      CheckpointsService,
    ) as jest.Mocked<CheckpointsService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /checkpoints/scan (Endpoint Scan Checkpoint)', () => {
    it('harus memanggil checkpointsService.scanCheckpoint dengan ID operator/mitra dan DTO', async () => {
      const dto = {
        qrCodeTrip: 'TRIP-12345678',
        qrCodeTicket: 'TKT-12345678',
        posId: '5',
        scanType: ScanType.checkin_origin,
      };
      const expectedResponse = {
        message: 'Check-in Pos Asal berhasil.',
        checkpoint: { id: '1000' },
      } as any;

      checkpointsService.scanCheckpoint.mockResolvedValue(expectedResponse);

      const result = await controller.scanCheckpoint('88', dto as any);

      expect(checkpointsService.scanCheckpoint).toHaveBeenCalledWith('88', dto);
      expect(result).toEqual(expectedResponse);
    });
  });
});
