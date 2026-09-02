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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PickupPointService } from './pickup-point.service';
import { CreatePickupPointDto } from './dto/create-pickup-point.dto';
import { UpdatePickupPointDto } from './dto/update-pickup-point.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { GetUser } from '../../common/decorators/get-user.decorators';

@ApiTags('Pickup Points (Pos Resmi)')
@Controller('pickup-points')
export class PickupPointController {
  constructor(private readonly pickupPointService: PickupPointService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.regional)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tambah Pickup Point / Pos Resmi Baru (Admin/Superadmin)',
  })
  @ApiResponse({ status: 201, description: 'Pos resmi berhasil dibuat' })
  @ApiResponse({
    status: 400,
    description: 'Payload atau role operator tidak valid',
  })
  @ApiResponse({
    status: 404,
    description: 'Region, City, atau Operator tidak ditemukan',
  })
  async create(
    @GetUser('role') currentUserRole: Role,
    @GetUser('regionId') currentUserRegionId: string,
    @Body() dto: CreatePickupPointDto,
  ) {
    if (currentUserRole === Role.regional && currentUserRegionId) {
      dto.regionId = currentUserRegionId;
    }

    return this.pickupPointService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Melihat seluruh Pos Resmi' })
  @ApiQuery({ name: 'regionId', required: false })
  @ApiQuery({ name: 'cityId', required: false })
  @ApiQuery({ name: 'onlyActive', type: Boolean, required: false })
  @ApiResponse({ status: 200, description: 'Daftar Pos Resmi ditemukan' })
  async findAll(
    @GetUser() currentUser?: any,
    @Query('regionId') regionId?: string,
    @Query('cityId') cityId?: string,
    @Query('onlyActive') onlyActive?: string,
  ) {
    const isActive = onlyActive === 'true' || onlyActive === '1';

    const currentUserRole = currentUser?.role;
    const currentUserRegionId = currentUser?.regionId;

    const targetRegionId =
      currentUserRole === Role.regional ? currentUserRegionId : regionId;

    return this.pickupPointService.findAll(targetRegionId, cityId, isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Melihat detail Pos Resmi berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Pos resmi ditemukan' })
  @ApiResponse({ status: 404, description: 'Pos Resmi tidak ditemukan' })
  async findOne(@Param('id') id: string) {
    return this.pickupPointService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.regional)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update/Deaktivasi Pos Resmi (Admin/Superadmin)' })
  @ApiResponse({ status: 200, description: 'Pos resmi berhasil diperbarui' })
  @ApiResponse({ status: 403, description: 'Bukan pos resmi wilayah Anda' })
  @ApiResponse({ status: 404, description: 'Pos resmi tidak ditemukan' })
  async update(
    @Param('id') id: string,
    @GetUser() currentUser: any,
    @Body() dto: UpdatePickupPointDto,
  ) {
    return this.pickupPointService.update(id, currentUser, dto);
  }
}
