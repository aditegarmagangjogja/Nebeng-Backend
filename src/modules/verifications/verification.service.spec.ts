import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { VerificationService } from './verification.service';
import { VerificationRepository } from './repositories/verification.repository';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  VerificationStatus,
  VerificationType,
} from '../../generated/prisma/enums';

describe('VerificationService', () => {
  let service: VerificationService;
  let repository: jest.Mocked<VerificationRepository>;

  const mockVerification = {
    id: BigInt(1),
    userId: BigInt(10),
    approvedByUserId: null,
    type: VerificationType.ktp,
    status: VerificationStatus.pending,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    files: [
      {
        id: BigInt(100),
        verificationId: BigInt(1),
        filePath: '/uploads/ktp.jpg',
        fileType: 'image/jpeg',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    user: {
      id: BigInt(10),
      name: 'Test Driver',
      email: 'driver@nebeng.com',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      findPendingOrApprovedByUserId: jest.fn(),
      createVerification: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      updateReviewStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: VerificationRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
    repository = module.get(
      VerificationRepository,
    ) as jest.Mocked<VerificationRepository>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('sumbitVerification (Pengajuan Dokumen Verifikasi)', () => {
    it('harus berhasil mengajukan verifikasi saat file valid dan belum ada pengajuan aktif', async () => {
      const dto = {
        type: VerificationType.ktp,
        files: [{ filePath: '/uploads/ktp.jpg', fileType: 'image/jpeg' }],
      };

      repository.findPendingOrApprovedByUserId.mockResolvedValue(null);
      repository.createVerification.mockResolvedValue(mockVerification as any);

      const result = await service.sumbitVerification('10', dto);

      expect(repository.findPendingOrApprovedByUserId).toHaveBeenCalledWith(
        BigInt(10),
        VerificationType.ktp,
      );
      expect(repository.createVerification).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.id).toEqual('1');
    });

    it('harus melemparkan BadRequestException jika daftar file kosong', async () => {
      const dto = {
        type: VerificationType.ktp,
        files: [],
      };

      await expect(service.sumbitVerification('10', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('harus melemparkan ConflictException jika verifikasi jenis tersebut masih berstatus PENDING', async () => {
      const dto = {
        type: VerificationType.ktp,
        files: [{ filePath: '/uploads/ktp.jpg', fileType: 'image/jpeg' }],
      };

      repository.findPendingOrApprovedByUserId.mockResolvedValue(
        mockVerification as any,
      );

      await expect(service.sumbitVerification('10', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('harus melemparkan ConflictException jika verifikasi jenis tersebut sudah APPROVED', async () => {
      const dto = {
        type: VerificationType.ktp,
        files: [{ filePath: '/uploads/ktp.jpg', fileType: 'image/jpeg' }],
      };

      repository.findPendingOrApprovedByUserId.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.approved,
      } as any);

      await expect(service.sumbitVerification('10', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getAllVerifications (Mengambil Seluruh Antrean Verifikasi)', () => {
    it('harus mengembalikan daftar verifikasi yang telah diformat oleh mapper', async () => {
      repository.findAll.mockResolvedValue([mockVerification] as any);

      const result = await service.getAllVerifications(
        VerificationStatus.pending,
        '5',
      );

      expect(repository.findAll).toHaveBeenCalledWith(
        VerificationStatus.pending,
        '5',
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toEqual('1');
    });
  });

  describe('getVerificationById (Pencarian Verifikasi Berdasarkan ID)', () => {
    it('harus mengembalikan detail verifikasi jika ID ditemukan', async () => {
      repository.findById.mockResolvedValue(mockVerification as any);

      const result = await service.getVerificationById('1');

      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(result?.id).toEqual('1');
    });

    it('harus melemparkan NotFoundException jika verifikasi tidak ditemukan', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getVerificationById('99')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reviewVerification (Peninjauan dan Persetujuan Admin)', () => {
    it('harus berhasil menyetujui (APPROVE) verifikasi', async () => {
      const dto = { status: VerificationStatus.approved };
      const approvedVerification = {
        ...mockVerification,
        status: VerificationStatus.approved,
      };

      repository.findById.mockResolvedValue(mockVerification as any);
      repository.updateReviewStatus.mockResolvedValue(
        approvedVerification as any,
      );

      const result = await service.reviewVerification('1', '999', dto);

      expect(repository.updateReviewStatus).toHaveBeenCalledWith(
        '1',
        '999',
        VerificationStatus.approved,
        undefined,
      );
      expect(result?.status).toEqual(VerificationStatus.approved);
    });

    it('harus melempar BadRequestException jika adminId tidak valid atau undefined', async () => {
      await expect(
        service.reviewVerification('1', 'undefined', {
          status: VerificationStatus.approved,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus melempar NotFoundException jika data verifikasi yang ditinjau tidak ditemukan', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.reviewVerification('99', '999', {
          status: VerificationStatus.approved,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus melempar BadRequestException jika menolak (REJECT) tanpa memberikan alasan penolakan', async () => {
      repository.findById.mockResolvedValue(mockVerification as any);

      await expect(
        service.reviewVerification('1', '999', {
          status: VerificationStatus.rejected,
          rejectionReason: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus berhasil menolak (REJECT) verifikasi jika alasan penolakan diisi', async () => {
      const dto = {
        status: VerificationStatus.rejected,
        rejectionReason: 'Foto KTP buram',
      };
      const rejectedVerification = {
        ...mockVerification,
        status: VerificationStatus.rejected,
        rejectionReason: 'Foto KTP buram',
      };

      repository.findById.mockResolvedValue(mockVerification as any);
      repository.updateReviewStatus.mockResolvedValue(
        rejectedVerification as any,
      );

      const result = await service.reviewVerification('1', '999', dto);

      expect(repository.updateReviewStatus).toHaveBeenCalledWith(
        '1',
        '999',
        VerificationStatus.rejected,
        'Foto KTP buram',
      );
      expect(result?.status).toEqual(VerificationStatus.rejected);
    });
  });
});
