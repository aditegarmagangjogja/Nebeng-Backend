import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CheckpointsService } from './checkpoints.service';
import { ScanCheckpointDto } from './dto/scan-checkpoint.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { GetUser } from '../../common/decorators/get-user.decorators';

@ApiTags('Checkpoints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('checkpoints')
export class CheckpointsController {
  constructor(private readonly checkpointsService: CheckpointsService) {}

  @Post('scan')
  @Roles(Role.mitra, Role.operator, Role.regional, Role.admin)
  @ApiOperation({
    summary: 'Scan QR Checkpoint di Pos Asal/Tujuan (Operator Pos & Admin)',
  })
  @ApiResponse({ status: 201, description: 'Scan checkpoint berhasil' })
  @ApiResponse({
    status: 400,
    description:
      'Pos tidak sesuai, OTP parcel salah, atau tiket tidak terdaftar di trip',
  })
  @ApiResponse({
    status: 404,
    description: 'Data Trip atau Tiket tidak ditemukan',
  })
  async scanCheckpoint(@GetUser() user: any, @Body() dto: ScanCheckpointDto) {
    return this.checkpointsService.scanCheckpoint(user, dto);
  }

  @Post('manual-force-release')
  @Roles(Role.operator, Role.regional, Role.admin)
  @ApiOperation({
    summary:
      'Intervensi Darurat: Force Complete & Release Escrow manual oleh Operator Pos (HP Mitra Rusak)',
  })
  @ApiResponse({ status: 201, description: 'Pencairan manual berhasil' })
  async manualForceRelease(
    @GetUser() user: any,
    @Body('qrCodeTicket') qrCodeTicket: string,
    @Body('posId') posId: string,
    @Body('otpClaim') otpClaim?: string,
  ) {
    return this.checkpointsService.manualForceReleaseByOperator(
      user,
      qrCodeTicket,
      posId,
      otpClaim,
    );
  }
}
