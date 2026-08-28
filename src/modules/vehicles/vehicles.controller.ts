import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { VehicleService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { GetUser } from '../../common/decorators/get-user.decorators';

@ApiTags('Kendaraan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehicleService) {}

  @Post()
  @Roles(Role.mitra)
  @ApiOperation({ summary: 'Tambah kendaraan baru (Mitra Only)' })
  @ApiResponse({ status: 201, description: 'Kendaraan berhasil ditambahkan' })
  @ApiResponse({
    status: 403,
    description:
      'Akun mitra belum terverifikasi (statusVerification != approved)',
  })
  @ApiResponse({
    status: 409,
    description: 'Nomor plat kendaraan sudah terdaftar',
  })
  async createVehicle(
    @GetUser('id') user: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.createVehicle(String(user), dto);
  }

  @Get('me')
  @Roles(Role.mitra)
  @ApiOperation({ summary: 'Daftar kendaraan milik Mitra yang sedang login' })
  @ApiResponse({ status: 200, description: 'Daftar kendaraan ditemukan' })
  async getMyVehicles(@GetUser('id') userId: string) {
    return this.vehiclesService.getMyVehicles(String(userId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail kendaraan berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail kendaraan ditemukan' })
  @ApiResponse({ status: 404, description: 'Data kendaraan tidak ditemukan' })
  async getVehicleById(@Param('id') id: string) {
    return this.vehiclesService.getVehicleById(id);
  }

  @Patch(':id')
  @Roles(Role.mitra)
  @ApiOperation({ summary: 'Update data kendaraan (Owner Only)' })
  @ApiResponse({
    status: 200,
    description: 'Data kendaraan berhasil diperbarui',
  })
  @ApiResponse({
    status: 403,
    description: 'Anda tidak memiliki akses ke kendaraan ini',
  })
  @ApiResponse({ status: 404, description: 'Data kendaraan tidak ditemukan' })
  async updateVehicle(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.updateVehicle(id, String(userId), dto);
  }
}
