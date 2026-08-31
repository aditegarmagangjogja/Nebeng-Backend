import {
  Body,
  Controller,
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
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { QueryTripDto } from './dto/query-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { GetUser } from '../../common/decorators/get-user.decorators';

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.mitra)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buat jadwal Trip baru (Mitra Terverifikasi)' })
  @ApiResponse({ status: 201, description: 'Jadwal trip berhasil dibuat' })
  @ApiResponse({
    status: 403,
    description: 'Mitra belum terverifikasi atau kendaraan bukan milik anda',
  })
  @ApiResponse({
    status: 400,
    description: 'Pos asal dan pos tujuan tidak boleh sama',
  })
  async createTrip(@GetUser('id') userId: string, @Body() dto: CreateTripDto) {
    return this.tripsService.createTrip(String(userId), dto);
  }

  @Get()
  @ApiOperation({ summary: 'Pencarian & Listing Trip (Publik / Customer)' })
  @ApiResponse({ status: 200, description: 'Daftar Trip ditemukan' })
  async getTrips(@Query() query: QueryTripDto) {
    return this.tripsService.getTrips(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail Trip berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail trip ditemukan' })
  @ApiResponse({ status: 404, description: 'Trip tidak ditemukan' })
  async getTripById(@Param('id') id: string) {
    return this.tripsService.getTripById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.mitra)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update detail / status Trip (Mitra Owner Only)' })
  @ApiResponse({ status: 200, description: 'Trip berhasil diperbarui' })
  @ApiResponse({
    status: 403,
    description: 'Anda tidak berhak mengubah trip orang lain',
  })
  @ApiResponse({ status: 404, description: 'Trip tidak ditemukan' })
  async updateTrip(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.updateTrip(id, String(userId), dto);
  }
}
