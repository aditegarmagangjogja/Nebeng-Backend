import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

describe('WalletsController', () => {
  let controller: WalletsController;
  let walletService: jest.Mocked<WalletsService>;

  beforeEach(async () => {
    const mockService = {
      getMyWallet: jest.fn(),
      holdEscrow: jest.fn(),
      releaseEscrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [{ provide: WalletsService, useValue: mockService }],
    }).compile();

    controller = module.get<WalletsController>(WalletsController);
    walletService = module.get(WalletsService) as jest.Mocked<WalletsService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /wallets/me (Endpoint Rincian Dompet Digital Saya)', () => {
    it('harus memanggil walletService.getMyWallet dengan ID pengguna dari token', async () => {
      const expectedResponse = {
        id: '1',
        balance: 500000,
        heldEscrowBalance: 150000,
        transactions: [],
      } as any;

      walletService.getMyWallet.mockResolvedValue(expectedResponse);

      const result = await controller.getMyWallet('10');

      expect(walletService.getMyWallet).toHaveBeenCalledWith('10');
      expect(result).toEqual(expectedResponse);
    });
  });
});
