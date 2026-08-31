import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Request,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { SetPinDto } from './dto/set-pin.dto';
import { VerifyPinDto } from './dto/verify-pin.dto';
import { UpdateUserMeDto } from './dto/update-user-me.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UsersService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Memperbarui profil dasar akun sendiri' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  updateMyProfile(
    @Request() req: any,
    @Body() updateUserMeDto: UpdateUserMeDto,
  ): Promise<UserResponseDto> {
    const userId = req.user.id || req.user.sub;
    return this.userService.update(String(userId), updateUserMeDto);
  }

  @Patch('me/profile')
  @ApiOperation({
    summary:
      'Memperbarui rincian profil detail pengguna (KTP, Bank, Alamat KTP)',
  })
  @ApiResponse({ status: 200, type: UserResponseDto })
  updateMyProfileDetail(
    @Request() req: any,
    @Body() dto: UpdateUserProfileDto,
  ): Promise<UserResponseDto> {
    const userId = req.user.id || req.user.sub;
    return this.userService.updateProfileDetail(String(userId), dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Menghapus akun sendiri (Soft Delete & Anonimisasi)',
  })
  @ApiResponse({ status: 200, description: 'Akun berhasil dianonimkan' })
  removeMyAccount(@Request() req: any): Promise<UserResponseDto> {
    const userId = req.user.id || req.user.sub;
    return this.userService.remove(String(userId));
  }

  @Post('me/pin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Membuat atau memperbarui PIN keamanan (6 digit)' })
  setPin(@Request() req: any, @Body() setPinDto: SetPinDto) {
    const userId = req.user.id || req.user.sub;
    return this.userService.setPin(String(userId), setPinDto.pin);
  }

  @Post('me/pin/verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Memverifikasi PIN keamanan untuk transaksi' })
  verifyPin(@Request() req: any, @Body() verifyPinDto: VerifyPinDto) {
    const userId = req.user.id || req.user.sub;
    return this.userService.verifyPin(String(userId), verifyPinDto.pin);
  }

  @Post()
  @Roles(Role.superadmin, Role.admin_wilayah)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat pengguna baru' })
  @ApiResponse({
    status: 201,
    description: 'Pengguna berhasil dibuat',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Payload tidak valid' })
  @ApiResponse({
    status: 409,
    description: 'Email atau Nomor HP sudah terdaftar',
  })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(createUserDto);
  }

  @Get()
  @Roles(Role.superadmin, Role.admin_wilayah, Role.operator_pos)
  @ApiOperation({ summary: 'Mendapatkan semua daftar pengguna' })
  @ApiResponse({
    status: 200,
    description: 'Daftar pengguna berhasil diambil',
    type: [UserResponseDto],
  })
  findAll(): Promise<UserResponseDto[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  @Roles(Role.superadmin, Role.admin_wilayah, Role.operator_pos)
  @ApiOperation({ summary: 'Mendapatkan detail pengguna berdasarkan ID' })
  @ApiResponse({
    status: 200,
    description: 'Detail pengguna ditemukan',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan' })
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.superadmin, Role.admin_wilayah)
  @ApiOperation({ summary: 'Memperbarui data pengguna berdasarkan ID' })
  @ApiResponse({
    status: 200,
    description: 'Data pengguna berhasil diperbarui',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/status')
  @Roles(Role.superadmin, Role.admin_wilayah)
  @ApiOperation({
    summary: 'Mengubah status user (Active/Suspended/Blocked/Inactive)',
  })
  @ApiResponse({ status: 200, type: UserResponseDto })
  updateStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    return this.userService.updateStatus(id, updateUserStatusDto);
  }

  @Delete(':id')
  @Roles(Role.superadmin)
  @ApiOperation({
    summary: 'Menghapus pengguna berdasarkan ID (Hard/Soft Guard)',
  })
  @ApiResponse({
    status: 200,
    description: 'Pengguna berhasil dihapus atau dianonimkan',
  })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan' })
  remove(@Param('id') id: string) {
    return this.userService.forceRemoveByAdmin(id);
  }
}
