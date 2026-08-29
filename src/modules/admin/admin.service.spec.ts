import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, UserStatus } from '../../generated/prisma/enums';

describe('AdminService', () => {
  let service: AdminService;
  let repository: jest.Mocked<AdminRepository>;

  const mockGlobalAnalytics = {
    totalRevenue: 5000000,
    platformCommission: 500000,
    activeTripsCount: 12,
    totalTransactionsCount: 150,
    regionalSummary: [],
  };

  const mockRegionalAnalytics = {
    regionName: 'DI Yogyakarta',
    activePosCount: 8,
    departedTripsCount: 25,
    arrivedTripsCount: 20,
    pendingVerificationsCount: 3,
  };

  const mockEscrowLedger = {
    totalHeldEscrow: 1000000,
    totalReleasedEscrow: 4000000,
    recentTransactions: [],
  };

  const mockUserTarget = {
    id: BigInt(20),
    name: 'User Target',
    status: UserStatus.active,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      getGlobalAnalytics: jest.fn(),
      getRegionalAnalytics: jest.fn(),
      getEscrowLedger: jest.fn(),
      updateUserStatus: jest.fn(),
      findUserById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AdminRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    repository = module.get(AdminRepository) as jest.Mocked<AdminRepository>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('getGlobalDashboard (Dashboard Analitik Global)', () => {
    it('harus mengembalikan data analitik global platform', async () => {
      repository.getGlobalAnalytics.mockResolvedValue(
        mockGlobalAnalytics as any,
      );

      const result = await service.getGlobalDashboard();

      expect(repository.getGlobalAnalytics).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getRegionalDashboard (Dashboard Analitik Wilayah)', () => {
    it('harus mengembalikan analitik wilayah otomatis berdasarkan regionId milik Admin Wilayah', async () => {
      const currentUser = {
        role: Role.admin_wilayah,
        regionId: BigInt(5),
      };

      repository.getRegionalAnalytics.mockResolvedValue(
        mockRegionalAnalytics as any,
      );

      const result = await service.getRegionalDashboard(currentUser);

      expect(repository.getRegionalAnalytics).toHaveBeenCalledWith('5');
      expect(result).toBeDefined();
    });

    it('harus mengembalikan analitik wilayah yang ditargetkan jika diakses oleh Superadmin', async () => {
      const currentUser = { role: Role.superadmin };

      repository.getRegionalAnalytics.mockResolvedValue(
        mockRegionalAnalytics as any,
      );

      const result = await service.getRegionalDashboard(currentUser, '10');

      expect(repository.getRegionalAnalytics).toHaveBeenCalledWith('10');
      expect(result).toBeDefined();
    });

    it('harus melemparkan ForbiddenException jika Admin Wilayah tidak memiliki penugasan wilayah', async () => {
      const currentUser = { role: Role.admin_wilayah, regionId: null };

      await expect(service.getRegionalDashboard(currentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('harus melemparkan BadRequestException jika Superadmin tidak memberikan parameter targetRegionId', async () => {
      const currentUser = { role: Role.superadmin };

      await expect(service.getRegionalDashboard(currentUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('harus melemparkan ForbiddenException jika role pengguna tidak valid', async () => {
      const currentUser = { role: Role.customer };

      await expect(service.getRegionalDashboard(currentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getEscrowLedger (Buku Besar Escrow)', () => {
    it('harus mengembalikan ringkasan saldo held, released, dan transaksi escrow terakhir', async () => {
      repository.getEscrowLedger.mockResolvedValue(mockEscrowLedger as any);

      const result = await service.getEscrowLedger();

      expect(repository.getEscrowLedger).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('updateUserGovernance (Tata Kelola Status Akun User)', () => {
    it('harus berhasil memperbarui status akun user lain menjadi suspended', async () => {
      const dto = { status: UserStatus.suspended };

      repository.findUserById.mockResolvedValue(mockUserTarget as any);
      repository.updateUserStatus.mockResolvedValue({
        ...mockUserTarget,
        status: UserStatus.suspended,
      } as any);

      const result = await service.updateUserGovernance('10', '20', dto);

      expect(repository.findUserById).toHaveBeenCalledWith('20');
      expect(repository.updateUserStatus).toHaveBeenCalledWith(
        '20',
        UserStatus.suspended,
      );
      expect(result.status).toEqual(UserStatus.suspended);
    });

    it('harus melemparkan BadRequestException jika Admin mencoba mengubah status akunnya sendiri', async () => {
      const dto = { status: UserStatus.suspended };

      await expect(
        service.updateUserGovernance('10', '10', dto), // Admin ID (10) == Target ID (10)
      ).rejects.toThrow(BadRequestException);
    });

    it('harus melemparkan NotFoundException jika user sasaran tidak ditemukan', async () => {
      repository.findUserById.mockResolvedValue(null);

      await expect(
        service.updateUserGovernance('10', '999', {
          status: UserStatus.blocked,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
