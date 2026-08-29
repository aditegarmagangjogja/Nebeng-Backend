import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('register (Endpoint Pendaftaran Akun)', () => {
    it('harus memanggil authService.register dan mengembalikan data pengguna baru', async () => {
      const registerDto = {
        name: 'Test Customer',
        email: 'customer@nebeng.com',
        phone: '081234567890',
        password: 'Password123!',
      };

      const expectedResult = { id: '1', email: registerDto.email } as any;
      authService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto as any);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('login (Endpoint Otentikasi Masuk)', () => {
    it('harus memanggil authService.login dan mengembalikan akses token beserta profil', async () => {
      const loginDto = {
        email: 'customer@nebeng.com',
        password: 'Password123!',
      };
      const expectedResult = {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        user: { id: '1', email: loginDto.email } as any,
      };

      authService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getProfile (Endpoint Profil Pengguna Aktif)', () => {
    it('harus mengembalikan data req.user dari JwtAuthGuard', () => {
      const req = {
        user: { id: '1', email: 'customer@nebeng.com', role: 'customer' },
      };

      const result = controller.getProfile(req);

      expect(result).toEqual(req.user);
    });
  });

  describe('refresh (Endpoint Pembaruan Access Token)', () => {
    it('harus memanggil authService.refreshToken dan mengembalikan token baru', async () => {
      const refreshTokenDto = { refreshToken: 'valid_refresh_token' };
      const expectedResult = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      };

      authService.refreshToken.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('logout (Endpoint Keluar Akun)', () => {
    it('harus memanggil authService.logout dengan userId yang didapat dari req.user.id atau req.user.sub', async () => {
      const req = { user: { id: '1', sub: '1' } };
      const expectedResult = { message: 'Berhasil keluar dari aplikasi' };

      authService.logout.mockResolvedValue(expectedResult);

      const result = await controller.logout(req);

      expect(authService.logout).toHaveBeenCalledWith('1');
      expect(result).toEqual(expectedResult);
    });
  });
});
