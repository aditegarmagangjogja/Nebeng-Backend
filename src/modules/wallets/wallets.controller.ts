import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorators';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletService: WalletsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Cek saldo & riwayat dompet digital milik sendiri' })
  @ApiResponse({ status: 200, description: 'Rincian dompet ditemukan' })
  async getMyWallet(@GetUser('id') userId: string) {
    return this.walletService.getMyWallet(String(userId));
  }
}
