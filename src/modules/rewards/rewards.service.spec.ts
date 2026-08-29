import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { RewardsService } from './rewards.service';
import { RewardsRepository } from './repository/rewards.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RewardType } from '../../generated/prisma/enums';

describe('RewardsService', () => {
  let service: RewardsService;
  let repository: jest.Mocked<RewardsRepository>;

  const mockUser = {
    id: BigInt(10),
    name: 'Test Customer',
    rewardPoints: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRewardTransaction = {
    id: BigInt(1),
    userId: BigInt(10),
    points: 50,
    type: RewardType.earn,
    description: 'Bonus registrasi',
    createdAt: new Date(),
    user: mockUser,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      findUserById: jest.fn(),
      addRewardPoints: jest.fn(),
      deductRewardPoints: jest.fn(),
      getRewardHistoryByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardsService,
        { provide: RewardsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<RewardsService>(RewardsService);
    repository = module.get(
      RewardsRepository,
    ) as jest.Mocked<RewardsRepository>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('earnPoints (Penambahan Poin Reward oleh Admin)', () => {
    it('harus berhasil menambahkan poin jika pengguna ditemukan', async () => {
      const dto = { userId: '10', points: 50, description: 'Bonus transaksi' };

      repository.findUserById.mockResolvedValue(mockUser as any);
      repository.addRewardPoints.mockResolvedValue({
        user: { ...mockUser, rewardPoints: 150 },
        transaction: mockRewardTransaction,
      } as any);

      const result = await service.earnPoints(dto);

      expect(repository.findUserById).toHaveBeenCalledWith('10');
      expect(repository.addRewardPoints).toHaveBeenCalledWith({
        userIdStr: '10',
        points: 50,
        description: 'Bonus transaksi',
      });
      expect(result).toBeDefined();
    });

    it('harus melemparkan NotFoundException jika pengguna tidak ditemukan', async () => {
      repository.findUserById.mockResolvedValue(null);

      await expect(
        service.earnPoints({ userId: '999', points: 50 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('redeemPoints (Penukaran Poin Reward Pengguna)', () => {
    it('harus berhasil menukarkan poin jika saldo poin mencukupi', async () => {
      const dto = { points: 40, description: 'Tukar voucher diskon' };

      repository.findUserById.mockResolvedValue(mockUser as any); // Poin saat ini: 100
      repository.deductRewardPoints.mockResolvedValue({
        user: { ...mockUser, rewardPoints: 60 },
        transaction: {
          ...mockRewardTransaction,
          type: RewardType.redeem,
          points: 40,
        },
      } as any);

      const result = await service.redeemPoints('10', dto);

      expect(repository.findUserById).toHaveBeenCalledWith('10');
      expect(repository.deductRewardPoints).toHaveBeenCalledWith({
        userIdStr: '10',
        points: 40,
        description: 'Tukar voucher diskon',
      });
      expect(result).toBeDefined();
    });

    it('harus melemparkan BadRequestException jika saldo poin pengguna tidak mencukupi', async () => {
      repository.findUserById.mockResolvedValue({
        ...mockUser,
        rewardPoints: 20, // Saldo hanya 20
      } as any);

      await expect(
        service.redeemPoints('10', { points: 50 }), // Mencoba tukar 50
      ).rejects.toThrow(BadRequestException);

      expect(repository.deductRewardPoints).not.toHaveBeenCalled();
    });

    it('harus melemparkan NotFoundException jika pengguna tidak ditemukan', async () => {
      repository.findUserById.mockResolvedValue(null);

      await expect(service.redeemPoints('999', { points: 10 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserRewardSummary (Ringkasan Saldo & Riwayat Poin)', () => {
    it('harus mengembalikan jumlah poin dan daftar riwayat transaksi poin pengguna', async () => {
      repository.findUserById.mockResolvedValue(mockUser as any);
      repository.getRewardHistoryByUserId.mockResolvedValue([
        mockRewardTransaction,
      ] as any);

      const result = await service.getUserRewardSummary('10');

      expect(repository.findUserById).toHaveBeenCalledWith('10');
      expect(repository.getRewardHistoryByUserId).toHaveBeenCalledWith('10');
      expect(result).toBeDefined();
    });
  });
});
