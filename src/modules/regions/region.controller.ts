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
  ApiResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RegionService } from './region.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { CreateCityDto } from './dto/create-city.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';

@ApiTags('Wilayah & Kota')
@Controller()
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  // --- REGIONS ENDPOINTS ---
  @Post('regions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tambah Region Baru dengan Batas Spasial/Peta (Superadmin Only)',
  })
  async createRegion(@Body() dto: CreateRegionDto) {
    return this.regionService.createRegion(dto);
  }

  @Get('regions')
  @ApiOperation({
    summary: 'Melihat seluruh daftar Region dengan Paginasi & Batas Spasial',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'onlyActive', type: Boolean, required: false })
  async findAllRegions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('onlyActive') onlyActive?: string,
  ) {
    const parsedPage = page && !isNaN(Number(page)) ? parseInt(page, 10) : 1;
    const parsedLimit =
      limit && !isNaN(Number(limit)) ? parseInt(limit, 10) : 10;
    const isActive = onlyActive === 'true' || onlyActive === '1';

    return this.regionService.getAllRegions(parsedPage, parsedLimit, isActive);
  }

  @Get('regions/:id')
  @ApiOperation({
    summary: 'Melihat detail Region, Koordinat, dan Titik Pos Terikat',
  })
  @ApiResponse({ status: 200, description: 'Region ditemukan' })
  @ApiResponse({ status: 404, description: 'Region tidak ditemukan' })
  async findOneRegion(@Param('id') id: string) {
    return this.regionService.getRegionById(id);
  }

  @Patch('regions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update/Deaktivasi Region & Koordinat Spasial (Superadmin Only)',
  })
  @ApiResponse({ status: 200, description: 'Region berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Region tidak ditemukan' })
  async updateRegion(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.regionService.updateRegion(id, dto);
  }

  // --- CITIES ENDPOINTS ---
  @Post('cities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.regional)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tambah Kota Baru (Superadmin & Admin Wilayah)' })
  @ApiResponse({ status: 200, description: 'Kota berhasil dibuat' })
  @ApiResponse({ status: 409, description: 'Kota sudah terdaftar' })
  async createCity(@Body() dto: CreateCityDto) {
    return this.regionService.createCity(dto);
  }

  @Get('cities')
  @ApiOperation({ summary: 'Melihat seluruh daftar Kota' })
  async findAllCities() {
    return this.regionService.getAllCities();
  }
}
