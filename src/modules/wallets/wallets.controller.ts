import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { GetUser } from '../../common/decorators/get-user.decorators';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletService: WalletsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Cek saldo & riwayat dompet digital milik sendiri' })
  @ApiResponse({ status: 200, description: 'Rincian dompet ditemukan' })
  async getMyWallet(@GetUser('id') userId: string) {
    return this.walletService.getMyWallet(String(userId));
  }

  @Post('withdraw')
  @Roles(Role.mitra, Role.customer)
  @ApiOperation({
    summary: 'Penarikan saldo dompet ke rekening bank terdaftar',
  })
  @ApiResponse({
    status: 200,
    description: 'Permintaan penarikan saldo berhasil',
  })
  @ApiResponse({
    status: 400,
    description: 'Saldo tidak mencukupi atau rekening belum diisi',
  })
  async withdraw(
    @GetUser('id') userId: string,
    @Body('amount') amount: number,
  ) {
    return this.walletService.requestWithdrawal(String(userId), amount);
  }
}
