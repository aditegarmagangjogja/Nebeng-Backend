import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

describe('RewardsController', () => {
  let controller: RewardsController;
  let rewardsService: jest.Mocked<RewardsService>;

  beforeEach(async () => {
    const mockService = {
      getUserRewardSummary: jest.fn(),
      earnPoints: jest.fn(),
      redeemPoints: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RewardsController],
      providers: [{ provide: RewardsService, useValue: mockService }],
    }).compile();

    controller = module.get<RewardsController>(RewardsController);
    rewardsService = module.get(RewardsService) as jest.Mocked<RewardsService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /rewards/me (Endpoint Ringkasan Poin Saya)', () => {
    it('harus memanggil rewardsService.getUserRewardSummary dengan ID pengguna dari token', async () => {
      const expectedResponse = {
        rewardPoints: 100,
        history: [],
      } as any;

      rewardsService.getUserRewardSummary.mockResolvedValue(expectedResponse);

      const result = await controller.getMyRewardSummary('10');

      expect(rewardsService.getUserRewardSummary).toHaveBeenCalledWith('10');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('POST /rewards/earn (Endpoint Tambah Poin oleh Admin)', () => {
    it('harus memanggil rewardsService.earnPoints dengan DTO', async () => {
      const dto = { userId: '10', points: 50, description: 'Bonus' };
      const expectedResponse = { id: '1', points: 50, type: 'earn' } as any;

      rewardsService.earnPoints.mockResolvedValue(expectedResponse);

      const result = await controller.earnPoints(dto);

      expect(rewardsService.earnPoints).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('POST /rewards/redeem (Endpoint Penukaran Poin)', () => {
    it('harus memanggil rewardsService.redeemPoints dengan ID pengguna dan DTO', async () => {
      const dto = { points: 30, description: 'Tukar Poin' };
      const expectedResponse = { id: '2', points: 30, type: 'redeem' } as any;

      rewardsService.redeemPoints.mockResolvedValue(expectedResponse);

      const result = await controller.redeemPoints('10', dto);

      expect(rewardsService.redeemPoints).toHaveBeenCalledWith('10', dto);
      expect(result).toEqual(expectedResponse);
    });
  });
});
