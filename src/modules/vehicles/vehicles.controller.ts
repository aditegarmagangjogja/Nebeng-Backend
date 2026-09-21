import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
    @GetUser('id') userId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.createVehicle(String(userId), dto);
  }

  @Get('me')
  @Roles(Role.mitra)
  @ApiOperation({ summary: 'Daftar kendaraan milik Mitra yang sedang login' })
  @ApiResponse({ status: 200, description: 'Daftar kendaraan ditemukan' })
  async getMyVehicles(@GetUser('id') userId: string) {
    return this.vehiclesService.getMyVehicles(String(userId));
  }

  @Get()
  @Roles(Role.admin, Role.regional)
  @ApiOperation({
    summary:
<<<<<<< HEAD
      'Daftar semua kendaraan mitra (Admin/Regional Only), opsional difilter per wilayah',
  })
  @ApiResponse({ status: 200, description: 'Daftar kendaraan ditemukan' })
  async getAllVehicles(@Query('regionId') regionId?: string) {
    return this.vehiclesService.getAllVehicles(regionId);
=======
      'Daftar semua kendaraan mitra (Admin/Regional Only), opsional difilter per wilayah & paginasi',
  })
  @ApiResponse({ status: 200, description: 'Daftar kendaraan ditemukan' })
  async getAllVehicles(
    @GetUser() currentUser: any,
    @Query('regionId') regionId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 50;

    const targetRegionId =
      currentUser?.role === Role.regional || currentUser?.role === 'regional'
        ? currentUser.regionId?.toString()
        : regionId;

    return this.vehiclesService.getAllVehicles(
      targetRegionId,
      parsedPage,
      parsedLimit,
    );
>>>>>>> c35a26545b37948bacaf6b4b98309c967b67e74b
  }

  @Get(':id')
  @Roles(Role.mitra, Role.admin, Role.regional, Role.customer)
  @ApiOperation({ summary: 'Detail kendaraan berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail kendaraan ditemukan' })
  @ApiResponse({ status: 404, description: 'Data kendaraan tidak ditemukan' })
  async getVehicleById(@Param('id') id: string, @GetUser() currentUser: any) {
    return this.vehiclesService.getVehicleById(id, currentUser);
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

  @Delete(':id')
  @Roles(Role.mitra)
  @ApiOperation({ summary: 'Hapus kendaraan milik Mitra (Owner Only)' })
  @ApiResponse({ status: 200, description: 'Kendaraan berhasil dihapus' })
  @ApiResponse({
    status: 400,
    description: 'Kendaraan masih terikat pada perjalanan aktif',
  })
  @ApiResponse({ status: 404, description: 'Data kendaraan tidak ditemukan' })
  async deleteVehicle(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.vehiclesService.deleteVehicle(id, String(userId));
  }
}