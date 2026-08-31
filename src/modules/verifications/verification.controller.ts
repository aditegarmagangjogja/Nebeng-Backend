import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import { VerificationService } from './verification.service';
import { SumbitVerificationDto } from './dto/submit-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, VerificationStatus } from '../../generated/prisma/enums';
import { GetUser } from '../../common/decorators/get-user.decorators';

@ApiTags('Verifications')
@Controller('verifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('submit')
  @Roles(Role.customer, Role.mitra)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit dokumen verifikasi (KTP/SIM/SKCK/STNK)' })
  @ApiResponse({
    status: 201,
    description: 'Dokumen verifikasi berhasil dikirim dan menunggu peninjauan',
  })
  @ApiResponse({ status: 400, description: 'Payload atau file tidak valid' })
  @ApiResponse({
    status: 409,
    description:
      'Dokumen verifikasi jenis ini sedang diproses atau sudah disetujui',
  })
  async submit(
    @GetUser('id') userId: string,
    @Body() dto: SumbitVerificationDto,
  ) {
    return this.verificationService.submitVerification(String(userId), dto);
  }

  @Get()
  @Roles(Role.superadmin, Role.admin_wilayah)
  @ApiOperation({ summary: 'Melihat seluruh daftar antrean verifikasi' })
  @ApiQuery({ name: 'status', enum: VerificationStatus, required: false })
  @ApiResponse({
    status: 200,
    description: 'Daftar verifikasi berhasil diambil',
  })
  async findAll(
    @GetUser() currentUser: any,
    @Query('status') status?: VerificationStatus,
  ) {
    const targetRegionId =
      currentUser.role === Role.admin_wilayah ||
      currentUser.role === 'admin_wilayah'
        ? currentUser.regionId?.toString()
        : undefined;

    return this.verificationService.getAllVerifications(status, targetRegionId);
  }

  @Get(':id')
  @Roles(Role.superadmin, Role.admin_wilayah, Role.mitra, Role.customer)
  @ApiOperation({ summary: 'Melihat detail verifikasi berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail verifikasi ditemukan' })
  @ApiResponse({ status: 404, description: 'Verifikasi tidak ditemukan' })
  async findOne(@Param('id') id: string, @GetUser() currentUser: any) {
    const verification = await this.verificationService.getVerificationById(id);

    if (!verification) {
      throw new NotFoundException('Verifikasi tidak ditemukan');
    }

    const currentUserId = String(currentUser.id);
    const currentUserRole = currentUser.role;

    if (
      currentUserRole !== Role.superadmin &&
      currentUserRole !== Role.admin_wilayah
    ) {
      const ownerUserId = String(verification.userId || verification.user?.id);
      if (ownerUserId !== currentUserId) {
        throw new ForbiddenException(
          'Anda tidak memiliki akses untuk melihat detail verifikasi ini',
        );
      }
    }

    return verification;
  }

  @Patch(':id/review')
  @Roles(Role.superadmin, Role.admin_wilayah)
  @ApiOperation({ summary: 'Approve atau Reject dokumen verifikasi' })
  @ApiResponse({
    status: 200,
    description: 'Status verifikasi berhasil ditinjau dan diperbarui',
  })
  @ApiResponse({
    status: 400,
    description: 'Wajib mengisi alasan penolakan jika status REJECTED',
  })
  @ApiResponse({ status: 404, description: 'Verifikasi tidak ditemukan' })
  async review(
    @Param('id') id: string,
    @GetUser() currentUser: any,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.verificationService.reviewVerification(id, currentUser, dto);
  }
}
