import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { AdminService } from './admin.service';
import { UpdateUserGovernanceDto } from './dto/update-user-governance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { GetUser } from '../../common/decorators/get-user.decorators';
import {
  UpdatePlatformCommissionDto,
  UpdateRegionRateDto,
} from './dto/system-setting.dto';

@ApiTags('Admin Governance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/global')
  @Roles(Role.superadmin)
  @ApiOperation({
    summary: 'Melihat dashboard analitik global (Superadmin Only)',
  })
  @ApiResponse({ status: 200, description: 'Analitik global ditemukan' })
  async getGlobalDashboard() {
    return this.adminService.getGlobalDashboard();
  }

  @Get('dashboard/regional')
  @Roles(Role.admin_wilayah, Role.superadmin)
  @ApiOperation({ summary: 'Melihat dashboard analitik wilayah' })
  @ApiQuery({
    name: 'regionId',
    required: false,
    description: 'Wajib diisi jika dikirim oleh Superadmin',
  })
  @ApiResponse({ status: 200, description: 'Analitik wilayah ditemukan' })
  async getRegionalDashboard(
    @GetUser() user: any,
    @Query('regionId') targetRegionId?: string,
  ) {
    return this.adminService.getRegionalDashboard(user, targetRegionId);
  }

  @Get('escrow/ledger')
  @Roles(Role.superadmin)
  @ApiOperation({
    summary: 'Melihat buku besar audit Escrow (Superadmin Only)',
  })
  @ApiResponse({ status: 200, description: 'Buku besar Escrow ditemukan' })
  async getEscrowLedger() {
    return this.adminService.getEscrowLedger();
  }

  @Patch('users/:id/governance')
  @Roles(Role.admin_wilayah, Role.superadmin)
  @ApiOperation({
    summary: 'Mengubah status akun user (Suspended / Active / Banned)',
  })
  @ApiResponse({
    status: 200,
    description: 'Status tata kelola user berhasil diperbarui',
  })
  @ApiResponse({
    status: 400,
    description: 'Tidak dapat mengubah status sendiri',
  })
  @ApiResponse({ status: 404, description: 'User sasaran tidak ditemukan' })
  async updateUserGovernance(
    @GetUser() user: any,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserGovernanceDto,
  ) {
    return this.adminService.updateUserGovernance(user, targetUserId, dto);
  }

  @Patch('settings/commission')
  @Roles(Role.superadmin)
  @ApiOperation({
    summary: 'Pengaturan persentase komisi platform global (Hanya Superadmin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Persentase komisi platform berhasil diperbarui',
  })
  async updatePlatformCommission(@Body() dto: UpdatePlatformCommissionDto) {
    return this.adminService.updatePlatformCommission(dto.commissionPercentage);
  }

  @Patch('regions/:id/rate')
  @Roles(Role.admin_wilayah, Role.superadmin)
  @ApiOperation({
    summary: 'Pengaturan tarif Rp/Km Wilayah Asal (Admin Wilayah & Superadmin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tarif Rp/Km wilayah berhasil diperbarui',
  })
  @ApiResponse({ status: 404, description: 'Wilayah tidak ditemukan' })
  async updateRegionRate(
    @GetUser() user: any,
    @Param('id') regionId: string,
    @Body() dto: UpdateRegionRateDto,
  ) {
    return this.adminService.updateRegionRate(user, regionId, dto.pricePerKm);
  }

  @Patch('settings/rewards')
  @Roles(Role.superadmin)
  @ApiOperation({
    summary:
      'Pengaturan kelipatan nominal Poin Reward global (Hanya Superadmin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Pengaturan kelipatan Poin Reward berhasil diperbarui',
  })
  async updateRewardSetting(
    @Body('pointsMultiplier') pointsMultiplier: number,
  ) {
    return this.adminService.updateRewardSetting(pointsMultiplier);
  }
}
