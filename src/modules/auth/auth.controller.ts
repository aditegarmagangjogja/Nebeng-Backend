import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Membuat akun pengguna baru (Public: Customer / Mitra)',
  })
  @ApiResponse({
    status: 201,
    description: 'Register berhasil',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Data inputan tidak valid atau Email/Nomor Telepon sudah terdaftar',
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Masuk ke aplikasi' })
  @ApiResponse({
    status: 200,
    description: 'Login berhasil, mengembalikan token',
  })
  @ApiUnauthorizedResponse({
    description: 'Email/Password salah atau akun ditangguhkan',
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan data pengguna yang sedang login' })
  @ApiResponse({
    status: 200,
    description: 'Data pengguna ditemukan',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token tidak valid atau belum dikirimkan',
  })
  getProfile(@Request() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.authService.getProfile(userId);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mengubah kata sandi akun sendiri' })
  @ApiResponse({ status: 200, description: 'Kata sandi berhasil diubah' })
  @ApiUnauthorizedResponse({
    description: 'Kata sandi lama salah atau token tidak valid',
  })
  changePassword(
    @Request() req: any,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    const userId = req.user.id || req.user.sub;
    return this.authService.changePassword(userId, dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Memperbarui Access Token menggunakan Refresh Token',
  })
  @ApiResponse({
    status: 200,
    description: 'Access Token baru berhasil diterbitkan',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token tidak valid atau kadaluwarsa',
  })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Keluar dari aplikasi (Menghapus Refresh Token)' })
  @ApiResponse({ status: 200, description: 'Logout berhasil' })
  @ApiUnauthorizedResponse({ description: 'Token tidak valid' })
  logout(@Request() req: any) {
    return this.authService.logout(req.user.id || req.user.sub);
  }
}
