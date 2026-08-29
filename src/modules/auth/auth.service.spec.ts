import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRepository } from '../users/repositories/user.repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  Role,
  UserStatus,
  VerificationStatus,
} from '../../generated/prisma/enums';

// Mock modul bcrypt secara global untuk mengisolasi pengujian autentikasi
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let userRepository: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;

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
    pinHash: null,
    refreshToken: '$2b$10$hashedrefreshtoken',
    avatar: null,
    rewardPoints: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockUsersService = {
      create: jest.fn(),
    };

    const mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateRefreshToken: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'nebeng_secret_key';
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    userRepository = module.get(UserRepository) as jest.Mocked<UserRepository>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('register (Pendaftaran Akun Baru)', () => {
    it('harus memanggil UsersService.create dengan role default customer jika DTO valid', async () => {
      const registerDto = {
        name: 'Test Customer',
        email: 'customer@nebeng.com',
        phone: '081234567890',
        password: 'Password123!',
      };

      const expectedResponse = {
        id: '1',
        name: registerDto.name,
        email: registerDto.email,
        phone: registerDto.phone,
        role: Role.customer,
        status: UserStatus.active,
        statusVerification: VerificationStatus.unverified,
        rewardPoints: 0,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };

      usersService.create.mockResolvedValue(expectedResponse as any);

      const result = await service.register(registerDto as any);

      expect(usersService.create).toHaveBeenCalledWith({
        ...registerDto,
        role: Role.customer,
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('login (Autentikasi Pengguna)', () => {
    it('harus berhasil mengembalikan Access Token, Refresh Token, dan UserResponseDto jika kredensial benar', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockImplementation(async () => true);
      (bcrypt.hash as jest.Mock).mockImplementation(
        async () => '$2b$10$hashedrefreshtoken',
      );

      jwtService.sign
        .mockReturnValueOnce('mock_access_token' as never)
        .mockReturnValueOnce('mock_refresh_token' as never);

      const result = await service.login({
        email: 'customer@nebeng.com',
        password: 'Password123!',
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'customer@nebeng.com',
      );
      expect(userRepository.updateRefreshToken).toHaveBeenCalledWith(
        '1',
        '$2b$10$hashedrefreshtoken',
      );
      expect(result).toHaveProperty('accessToken', 'mock_access_token');
      expect(result).toHaveProperty('refreshToken', 'mock_refresh_token');
      expect(result.user.email).toEqual('customer@nebeng.com');
    });

    it('harus melemparkan UnauthorizedException jika email tidak terdaftar', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'salah@nebeng.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('harus melemparkan UnauthorizedException jika password tidak cocok', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockImplementation(async () => false);

      await expect(
        service.login({
          email: 'customer@nebeng.com',
          password: 'PasswordSalah',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('harus melemparkan UnauthorizedException jika status pengguna bukan active (ditangguhkan/diblokir)', async () => {
      userRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        status: UserStatus.suspended,
      } as any);
      (bcrypt.compare as jest.Mock).mockImplementation(async () => true);

      await expect(
        service.login({
          email: 'customer@nebeng.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken (Pembaruan Token)', () => {
    it('harus mengembalikan pasangan token baru saat Refresh Token valid dan cocok', async () => {
      jwtService.verify.mockReturnValue({
        sub: '1',
        email: mockUser.email,
        role: mockUser.role,
      } as never);
      userRepository.findById.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockImplementation(async () => true);
      (bcrypt.hash as jest.Mock).mockImplementation(
        async () => '$2b$10$newhashedrefreshtoken',
      );

      jwtService.sign
        .mockReturnValueOnce('new_access_token' as never)
        .mockReturnValueOnce('new_refresh_token' as never);

      const result = await service.refreshToken({
        refreshToken: 'valid_refresh_token',
      });

      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });
    });

    it('harus melemparkan UnauthorizedException jika token tidak cocok dengan hash di database', async () => {
      jwtService.verify.mockReturnValue({ sub: '1' } as never);
      userRepository.findById.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockImplementation(async () => false);

      await expect(
        service.refreshToken({ refreshToken: 'invalid_token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout (Keluar dari Aplikasi)', () => {
    it('harus menghapus refresh token di database (diatur menjadi null) dan mengembalikan pesan sukses', async () => {
      userRepository.updateRefreshToken.mockResolvedValue(mockUser as any);

      const result = await service.logout('1');

      expect(userRepository.updateRefreshToken).toHaveBeenCalledWith('1', null);
      expect(result).toEqual({ message: 'Berhasil keluar dari aplikasi' });
    });
  });
});
