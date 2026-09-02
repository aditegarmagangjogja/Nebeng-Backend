import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { EarnRewardDto } from './dto/earn-reward.dto';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { GetUser } from '../../common/decorators/get-user.decorators';

@ApiTags('Rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Melihat ringkasan saldo poin dan riwayat reward saya',
  })
  @ApiResponse({ status: 200, description: 'Ringkasan poin ditemukan' })
  async getMyRewardSummary(@GetUser('id') userId: string) {
    return this.rewardsService.getUserRewardSummary(String(userId));
  }

  @Post('earn')
  @Roles(Role.admin, Role.regional)
  @ApiOperation({ summary: 'Menambahkan poin reward ke user (Admin Only)' })
  @ApiResponse({ status: 201, description: 'Poin berhasil ditambahkan' })
  @ApiResponse({ status: 403, description: 'Bukan user wilayah Anda' })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan' })
  async earnPoints(@GetUser() currentUser: any, @Body() dto: EarnRewardDto) {
    return this.rewardsService.earnPoints(currentUser, dto);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Menukarkan poin reward milik pengguna' })
  @ApiResponse({ status: 201, description: 'Poin berhasil ditukarkan' })
  @ApiResponse({ status: 400, description: 'Saldo poin tidak mencukupi' })
  async redeemPoints(
    @GetUser('id') userId: string,
    @Body() dto: RedeemRewardDto,
  ) {
    return this.rewardsService.redeemPoints(String(userId), dto);
  }
}
