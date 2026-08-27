import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VehicleService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorators';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehicleService) {}

  @Post()
  @Roles('mitra')
  @ApiOperation({ summary: 'Tambah kendaraan baru (Mitra Only)' })
  async createVehicle(@GetUser() user: any, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.createVehicle(user.id, dto);
  }

  @Get('me')
  @Roles('mitra')
  @ApiOperation({ summary: 'Daftar kendaraan milik Mitra yang sedang login' })
  async getMyVehicles(@GetUser() user: any) {
    return this.vehiclesService.getMyVehicles(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail kendaraan berdasarkan ID' })
  async getVehicleById(@Param('id') id: string) {
    return this.vehiclesService.getVehicleById(id);
  }

  @Patch(':id')
  @Roles('mitra')
  @ApiOperation({ summary: 'Update data kendaraan (Owner Only)' })
  async updateVehicle(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.updateVehicle(id, user.id, dto);
  }
}
