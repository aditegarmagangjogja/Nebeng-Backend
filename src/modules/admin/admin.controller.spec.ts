import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserStatus } from '../../generated/prisma/enums';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<AdminService>;

  beforeEach(async () => {
    const mockService = {
      getGlobalDashboard: jest.fn(),
      getRegionalDashboard: jest.fn(),
      getEscrowLedger: jest.fn(),
      updateUserGovernance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get(AdminService) as jest.Mocked<AdminService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /admin/dashboard/global', () => {
    it('harus memanggil adminService.getGlobalDashboard', async () => {
      const expectedResponse = { totalRevenue: 5000000 } as any;
      adminService.getGlobalDashboard.mockResolvedValue(expectedResponse);

      const result = await controller.getGlobalDashboard();

      expect(adminService.getGlobalDashboard).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /admin/dashboard/regional', () => {
    it('harus memanggil adminService.getRegionalDashboard dengan user dan targetRegionId', async () => {
      const user = { id: '10', role: 'admin_wilayah' };
      const expectedResponse = { regionName: 'Yogyakarta' } as any;

      adminService.getRegionalDashboard.mockResolvedValue(expectedResponse);

      const result = await controller.getRegionalDashboard(user, '5');

      expect(adminService.getRegionalDashboard).toHaveBeenCalledWith(user, '5');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /admin/escrow/ledger', () => {
    it('harus memanggil adminService.getEscrowLedger', async () => {
      const expectedResponse = { totalHeldEscrow: 1000000 } as any;
      adminService.getEscrowLedger.mockResolvedValue(expectedResponse);

      const result = await controller.getEscrowLedger();

      expect(adminService.getEscrowLedger).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('PATCH /admin/users/:id/governance', () => {
    it('harus memanggil adminService.updateUserGovernance dengan adminId, targetUserId, dan DTO', async () => {
      const dto = { status: UserStatus.suspended };
      const expectedResponse = {
        userId: '20',
        status: UserStatus.suspended,
      } as any;

      adminService.updateUserGovernance.mockResolvedValue(expectedResponse);

      const result = await controller.updateUserGovernance('10', '20', dto);

      expect(adminService.updateUserGovernance).toHaveBeenCalledWith(
        '10',
        '20',
        dto,
      );
      expect(result).toEqual(expectedResponse);
    });
  });
});
