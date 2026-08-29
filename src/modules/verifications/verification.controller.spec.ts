import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  Role,
  VerificationStatus,
  VerificationType,
} from '../../generated/prisma/enums';

describe('VerificationController', () => {
  let controller: VerificationController;
  let verificationService: jest.Mocked<VerificationService>;

  beforeEach(async () => {
    const mockService = {
      sumbitVerification: jest.fn(),
      getAllVerifications: jest.fn(),
      getVerificationById: jest.fn(),
      reviewVerification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [{ provide: VerificationService, useValue: mockService }],
    }).compile();

    controller = module.get<VerificationController>(VerificationController);
    verificationService = module.get(
      VerificationService,
    ) as jest.Mocked<VerificationService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /verifications/submit', () => {
    it('harus memanggil verificationService.sumbitVerification dengan ID user dan DTO', async () => {
      const dto = {
        type: VerificationType.ktp,
        files: [{ filePath: '/uploads/ktp.jpg', fileType: 'image/jpeg' }],
      };
      const expectedResponse = {
        id: '1',
        status: VerificationStatus.pending,
      } as any;

      verificationService.sumbitVerification.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.submit('10', dto as any);

      expect(verificationService.sumbitVerification).toHaveBeenCalledWith(
        '10',
        dto,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /verifications', () => {
    it('harus membatasi wilayah untuk role admin_wilayah', async () => {
      verificationService.getAllVerifications.mockResolvedValue([]);

      await controller.findAll(
        Role.admin_wilayah,
        'region-5',
        VerificationStatus.pending,
      );

      expect(verificationService.getAllVerifications).toHaveBeenCalledWith(
        VerificationStatus.pending,
        'region-5',
      );
    });

    it('harus tidak membatasi wilayah (undefined) jika pengguna adalah superadmin', async () => {
      verificationService.getAllVerifications.mockResolvedValue([]);

      await controller.findAll(
        Role.superadmin,
        'region-5',
        VerificationStatus.pending,
      );

      expect(verificationService.getAllVerifications).toHaveBeenCalledWith(
        VerificationStatus.pending,
        undefined,
      );
    });
  });

  describe('GET /verifications/:id', () => {
    it('harus mengizinkan superadmin atau admin_wilayah melihat detail verifikasi siapapun', async () => {
      const mockVerification = { id: '1', userId: '100' } as any;
      verificationService.getVerificationById.mockResolvedValue(
        mockVerification,
      );

      const result = await controller.findOne('1', '999', Role.superadmin);

      expect(result).toEqual(mockVerification);
    });

    it('harus mengizinkan pemilik dokumen (customer/mitra) melihat verifikasinya sendiri', async () => {
      const mockVerification = { id: '1', userId: '10' } as any;
      verificationService.getVerificationById.mockResolvedValue(
        mockVerification,
      );

      const result = await controller.findOne('1', '10', Role.customer);

      expect(result).toEqual(mockVerification);
    });

    it('harus melemparkan ForbiddenException jika customer/mitra mencoba melihat dokumen orang lain', async () => {
      const mockVerification = { id: '1', userId: '100' } as any;
      verificationService.getVerificationById.mockResolvedValue(
        mockVerification,
      );

      await expect(
        controller.findOne('1', '10', Role.customer),
      ).rejects.toThrow(ForbiddenException);
    });

    it('harus melemparkan NotFoundException jika verifikasi tidak ada', async () => {
      verificationService.getVerificationById.mockResolvedValue(null as any);

      await expect(
        controller.findOne('99', '10', Role.customer),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH /verifications/:id/review', () => {
    it('harus memanggil verificationService.reviewVerification dengan ID verifikasi, adminId, dan DTO', async () => {
      const dto = { status: VerificationStatus.approved };
      const req = { user: { id: '999' } };
      const expectedResponse = {
        id: '1',
        status: VerificationStatus.approved,
      } as any;

      verificationService.reviewVerification.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.review('1', req, dto);

      expect(verificationService.reviewVerification).toHaveBeenCalledWith(
        '1',
        '999',
        dto,
      );
      expect(result).toEqual(expectedResponse);
    });
  });
});
