import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { WalletsService } from './wallets.service';
import { WalletsRepository } from './repository/wallets.repository';
import { BadRequestException } from '@nestjs/common';

describe('WalletsService', () => {
  let service: WalletsService;
  let repository: jest.Mocked<WalletsRepository>;

  const mockWallet = {
    id: BigInt(1),
    userId: BigInt(10),
    balance: '500000.00' as any,
    heldEscrowBalance: '150000.00' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    transactions: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      findByUserId: jest.fn(),
      createWallets: jest.fn(),
      processEscrowHold: jest.fn(),
      processEscrowRelease: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: WalletsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
    repository = module.get(
      WalletsRepository,
    ) as jest.Mocked<WalletsRepository>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('getMyWallet (Cek Saldo Dompet Digital)', () => {
    it('harus mengembalikan data dompet digital jika dompet pengguna sudah ada', async () => {
      repository.findByUserId.mockResolvedValue(mockWallet as any);

      const result = await service.getMyWallet('10');

      expect(repository.findByUserId).toHaveBeenCalledWith('10');
      expect(repository.createWallets).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.id).toEqual('1');
    });

    it('harus otomatis membuatkan dompet digital baru jika pengguna belum memiliki dompet', async () => {
      repository.findByUserId.mockResolvedValue(null);
      repository.createWallets.mockResolvedValue({
        ...mockWallet,
        balance: '0.00' as any,
        heldEscrowBalance: '0.00' as any,
      } as any);

      const result = await service.getMyWallet('10');

      expect(repository.findByUserId).toHaveBeenCalledWith('10');
      expect(repository.createWallets).toHaveBeenCalledWith('10');
      expect(result).toBeDefined();
    });
  });

  describe('holdEscrow (Penahanan Dana di Escrow)', () => {
    it('harus memproses penahanan dana Escrow saat transaksi pembayaran order baru berhasil', async () => {
      repository.findByUserId.mockResolvedValue(mockWallet as any);
      repository.processEscrowHold.mockResolvedValue(mockWallet as any);

      await service.holdEscrow('10', '100', 50000);

      expect(repository.findByUserId).toHaveBeenCalledWith('10');
      expect(repository.processEscrowHold).toHaveBeenCalledWith(
        BigInt(1),
        '100',
        50000,
      );
    });

    it('harus otomatis membuat dompet digital terlebih dahulu jika mitra belum memiliki dompet saat menerima penahanan Escrow', async () => {
      repository.findByUserId.mockResolvedValue(null);
      repository.createWallets.mockResolvedValue(mockWallet as any);
      repository.processEscrowHold.mockResolvedValue(mockWallet as any);

      await service.holdEscrow('10', '100', 50000);

      expect(repository.createWallets).toHaveBeenCalledWith('10');
      expect(repository.processEscrowHold).toHaveBeenCalledWith(
        BigInt(1),
        '100',
        50000,
      );
    });
  });

  describe('releaseEscrow (Pencairan Dana Escrow ke Saldo Utam/Mitra)', () => {
    it('harus berhasil mencairkan dana Escrow jika saldo heldEscrowBalance cukup', async () => {
      repository.findByUserId.mockResolvedValue(mockWallet as any); // heldEscrowBalance = 150000
      repository.processEscrowRelease.mockResolvedValue(mockWallet as any);

      await service.releaseEscrow('10', '100', 50000);

      expect(repository.processEscrowRelease).toHaveBeenCalledWith(
        BigInt(1),
        '100',
        50000,
      );
    });

    it('harus melemparkan BadRequestException jika saldo Escrow yang ditahan kurang dari jumlah yang akan dicairkan', async () => {
      repository.findByUserId.mockResolvedValue({
        ...mockWallet,
        heldEscrowBalance: '30000.00' as any, // Saldo ditahan hanya 30rb
      } as any);

      await expect(
        service.releaseEscrow('10', '100', 50000), // Mencoba mencairkan 50rb
      ).rejects.toThrow(BadRequestException);

      expect(repository.processEscrowRelease).not.toHaveBeenCalled();
    });
  });
});
