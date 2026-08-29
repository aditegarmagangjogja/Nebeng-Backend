import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { UsersService } from './users.service';
import { UserRepository } from './repositories/user.repository';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  Role,
  UserStatus,
  VerificationStatus,
} from '../../generated/prisma/enums';

// Mock modul bcrypt secara global untuk mengisolasi logika pengujian PIN & Password
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UserRepository>;

  const mockUser = {
    id: BigInt(1),
    regionId: null,
    name: 'Test Customer',
    email: 'customer@nebeng.com',
    phone: '081234567890',
    password: '$2b$10$hashedpassword',
    role: Role.customer,
    status: UserStatus.active,
    statusVerification: VerificationStatus.unverified,
    pinHash: '$2b$10$hashedpin',
    refreshToken: null,
    avatar: null,
    rewardPoints: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      findRegionById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      updatePin: jest.fn(),
      updateRefreshToken: jest.fn(),
      countUserRelations: jest.fn(),
      anonymize: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(UserRepository) as jest.Mocked<UserRepository>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('create (Pembuatan Pengguna Baru)', () => {
    it('harus berhasil membuat dan mengembalikan data pengguna baru saat DTO valid', async () => {
      const dto = {
        name: 'Test Customer',
        email: 'customer@nebeng.com',
        phone: '081234567890',
        password: 'Password123!',
        role: Role.customer,
        status: UserStatus.active,
      };

      repository.findByEmail.mockResolvedValue(null);
      repository.findByPhone.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockImplementation(
        async () => '$2b$10$hashedpassword',
      );
      repository.create.mockResolvedValue(mockUser as any);

      const result = await service.create(dto as any);

      expect(repository.findByEmail).toHaveBeenCalledWith(
        'customer@nebeng.com',
      );
      expect(repository.create).toHaveBeenCalled();
      expect(result.email).toEqual('customer@nebeng.com');
    });

    it('harus melemparkan ConflictException jika email sudah terdaftar di sistem', async () => {
      repository.findByEmail.mockResolvedValue(mockUser as any);

      await expect(
        service.create({
          email: 'customer@nebeng.com',
          phone: '081234567890',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne (Pencarian Pengguna berdasarkan ID)', () => {
    it('harus mengembalikan data pengguna saat ID ditemukan', async () => {
      repository.findById.mockResolvedValue(mockUser as any);

      const result = await service.findOne('1');

      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(result.id).toEqual('1');
    });

    it('harus melemparkan NotFoundException jika pengguna tidak ditemukan', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyPin (Verifikasi PIN Keamanan 6-Digit)', () => {
    it('harus mengembalikan { valid: true } saat PIN yang dimasukkan benar', async () => {
      repository.findById.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockImplementation(async () => true);

      const result = await service.verifyPin('1', '123456');

      expect(result).toEqual({ valid: true });
    });

    it('harus melemparkan NotFoundException jika pengguna belum mengatur PIN', async () => {
      repository.findById.mockResolvedValue({
        ...mockUser,
        pinHash: null,
      } as any);

      await expect(service.verifyPin('1', '123456')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('harus melemparkan BadRequestException jika PIN yang dimasukkan salah', async () => {
      repository.findById.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockImplementation(async () => false);

      await expect(service.verifyPin('1', '000000')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('forceRemoveByAdmin (Penghapusan Pengguna oleh Admin)', () => {
    it('harus melakukan anonisasi data (soft delete) jika pengguna memiliki riwayat transaksi/finansial', async () => {
      repository.findById.mockResolvedValue(mockUser as any);
      repository.countUserRelations.mockResolvedValue({
        ordersCount: 2,
        tripsCount: 0,
        walletTransactionsCount: 1,
      });
      repository.anonymize.mockResolvedValue({
        ...mockUser,
        status: UserStatus.deleted,
      } as any);

      await service.forceRemoveByAdmin('1');

      expect(repository.anonymize).toHaveBeenCalled();
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('harus menghapus akun secara permanen dari database jika pengguna tidak memiliki riwayat finansial', async () => {
      repository.findById.mockResolvedValue(mockUser as any);
      repository.countUserRelations.mockResolvedValue({
        ordersCount: 0,
        tripsCount: 0,
        walletTransactionsCount: 0,
      });
      repository.delete.mockResolvedValue(mockUser as any);

      await service.forceRemoveByAdmin('1');

      expect(repository.delete).toHaveBeenCalledWith('1');
      expect(repository.anonymize).not.toHaveBeenCalled();
    });
  });
});
