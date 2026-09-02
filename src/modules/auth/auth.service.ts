import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserRepository } from '../users/repositories/user.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserMapper } from '../users/mappers/user.mapper';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { Role } from '../../generated/prisma/enums';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const secret =
      this.configService.get<string>('JWT_SECRET') || 'nebeng_secret_key';

    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ||
        '15m') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
        '7d') as any,
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.updateRefreshToken(userId, hashedRefreshToken);

    return { accessToken, refreshToken };
  }

  async register(registerDto: RegisterDto): Promise<UserResponseDto> {
    const assignedRole = (registerDto.role as unknown as Role) || Role.customer;

    return this.usersService.create({
      ...registerDto,
      role: assignedRole,
    });
  }

  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponseDto;
  }> {
    const user = await this.userRepository.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException(
        'Akun Anda sedang ditangguhkan atau diblokir',
      );
    }

    const tokens = await this.generateTokens(
      user.id.toString(),
      user.email,
      user.role,
    );

    return {
      ...tokens,
      user: UserMapper.toResponse(user),
    };
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan');
    }
    return UserMapper.toResponse(user);
  }

  async changePassword(
    userId: string,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Kata sandi saat ini salah');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.update(userId, { password: hashedNewPassword });

    return { message: 'Kata sandi berhasil diperbarui' };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const secret =
        this.configService.get<string>('JWT_SECRET') || 'nebeng_secret_key';
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret,
      });

      const user = await this.userRepository.findById(payload.sub);
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException(
          'Akses ditolak. Token tidak valid atau sudah logout',
        );
      }

      const isRefreshTokenMatching = await bcrypt.compare(
        refreshTokenDto.refreshToken,
        user.refreshToken,
      );

      if (!isRefreshTokenMatching) {
        throw new UnauthorizedException('Refresh token tidak cocok');
      }

      const tokens = await this.generateTokens(
        user.id.toString(),
        user.email,
        user.role,
      );
      return tokens;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException(
        'Refresh token kedaluwarsa atau tidak valid',
      );
    }
  }

  async logout(userId: string) {
    await this.userRepository.updateRefreshToken(userId, null);
    return { message: 'Berhasil keluar dari aplikasi' };
  }
}
