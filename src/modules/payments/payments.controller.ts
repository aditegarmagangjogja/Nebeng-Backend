import { Body, Controller, Get, Post, UseGuards, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CheckoutPaymentDto } from './dto/checkout-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { GetUser } from '../../common/decorators/get-user.decorators';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @Roles(Role.customer)
  @ApiOperation({
    summary: 'Simulasi checkout pembayaran order (Customer Only)',
  })
  @ApiResponse({ status: 201, description: 'Pembayaran berhasil dikonfirmasi' })
  @ApiResponse({
    status: 400,
    description:
      'Order bukan milik Anda, PIN salah, atau status order tidak valid',
  })
  @ApiResponse({ status: 404, description: 'Order tidak ditemukan' })
  async checkoutPayment(
    @GetUser('id') userId: string,
    @Body() dto: CheckoutPaymentDto,
  ) {
    return this.paymentsService.checkoutPayment(String(userId), dto);
  }

  @Get()
  @Roles(Role.admin, Role.regional)
  @ApiOperation({
    summary: 'Melihat daftar transaksi wilayah (admin & regional) ',
  })
  @ApiQuery({
    name: 'regionId',
    required: false,
    description: 'Opsional untuk superadmin',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar transaksi berhasil diambil',
  })
  async getPayments(
    @GetUser() currentUser: any,
    @Query('regionId') queryRegionId?: string,
  ) {
    const targetRegionId =
      currentUser.role === Role.regional || currentUser.role === 'regional'
        ? currentUser.regionId.toString()
        : queryRegionId;

    return this.paymentsService.getPaymentsByRegion(targetRegionId);
  }

  @Get('operator-summary')
  @Roles(Role.operator, Role.regional, Role.admin)
  @ApiOperation({
    summary: 'Melihat rekapitulasi finansial pos untuk Operator',
  })
  async getOperatorSummary(@GetUser() currentUser: any) {
    return this.paymentsService.getPaymentsByOperator(String(currentUser.id));
  }
}
