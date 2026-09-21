import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MerchandiseService } from './merchandise.service';
import { CreateMerchandiseDto } from './dto/create-merchandise.dto';
import { UpdateMerchandiseDto } from './dto/update-merchandise.dto';
import { RedeemMerchandiseDto } from './dto/redeem-merchandise.dto';
import { UpdateRedemptionStatusDto } from './dto/update-redemption-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorators';
import { Role } from '../../generated/prisma/enums';

@ApiTags('Merchandises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('merchandises')
export class MerchandiseController {
  constructor(private readonly service: MerchandiseService) {}

  // 1. Endpoint Customer: Katalog Barang
  @Get()
  @ApiOperation({ summary: 'Melihat katalog merchandise yang tersedia' })
  async getCatalog(@Query('all') all?: string) {
    return this.service.getAllItems(all !== 'true');
  }

  @Get('item/:id')
  @ApiOperation({ summary: 'Melihat detail satu item merchandise' })
  async getItemDetail(@Param('id') id: string) {
    return this.service.getItemById(id);
  }

  // 2. Endpoint Customer: Tukar Poin & Riwayat Pribadi
  @Post('redeem')
  @ApiOperation({
    summary: 'Customer menukarkan reward points dengan merchandise',
  })
  async redeem(
    @GetUser('id') userId: string,
    @Body() dto: RedeemMerchandiseDto,
  ) {
    return this.service.redeemItem(String(userId), dto);
  }

  @Get('my-redemptions')
  @ApiOperation({
    summary: 'Customer melihat riwayat klaim merchandise miliknya',
  })
  async getMyRedemptions(@GetUser('id') userId: string) {
    return this.service.getMyRedemptions(String(userId));
  }

  // 3. Endpoint Khusus Superadmin (Role.admin)
  @Post()
  @Roles(Role.admin)
  @ApiOperation({ summary: '[Superadmin] Menambah item merchandise baru' })
  async createItem(@Body() dto: CreateMerchandiseDto) {
    return this.service.createItem(dto);
  }

  @Patch(':id')
  @Roles(Role.admin)
  @ApiOperation({ summary: '[Superadmin] Mengupdate item merchandise / stok' })
  async updateItem(@Param('id') id: string, @Body() dto: UpdateMerchandiseDto) {
    return this.service.updateItem(id, dto);
  }

  @Delete(':id')
  @Roles(Role.admin)
  @ApiOperation({ summary: '[Superadmin] Menonaktifkan item merchandise' })
  async deleteItem(@Param('id') id: string) {
    return this.service.deleteItem(id);
  }

  @Get('admin/redemptions')
  @Roles(Role.admin)
  @ApiOperation({
    summary: '[Superadmin] Melihat seluruh antrean klaim merchandise',
  })
  async getAllRedemptions() {
    return this.service.getAllRedemptionsAdmin();
  }

  @Patch('admin/redemptions/:id/status')
  @Roles(Role.admin)
  @ApiOperation({
    summary: '[Superadmin] Mengupdate status klaim dan no resi pengiriman',
  })
  async updateRedemptionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRedemptionStatusDto,
  ) {
    return this.service.updateRedemptionStatusAdmin(id, dto);
  }
}
