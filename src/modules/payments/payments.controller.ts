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
import { GetOperatorSummaryQueryDto } from './dto/operator-summary.dto'; // Buat DTO ini
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
    summary: 'Checkout pembayaran order (Customer Only)',
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
    summary: 'Melihat daftar transaksi wilayah (Admin & Regional)',
  })
  @ApiQuery({
    name: 'regionId',
    required: false,
    description: 'Opsional untuk Superadmin',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Daftar transaksi berhasil diambil',
  })
  async getPayments(
    @GetUser() currentUser: any,
    @Query('regionId') queryRegionId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.paymentsService.getPaymentsByRegion(
      currentUser,
      queryRegionId,
      Number(page),
      Number(limit),
    );
  }

  @Get('operator-summary')
  @Roles(Role.operator, Role.regional, Role.admin)
  @ApiOperation({
    summary: 'Melihat rekapitulasi finansial pos untuk Operator',
  })
  async getOperatorSummary(
    @GetUser('id') operatorUserId: string,
    @Query() query: GetOperatorSummaryQueryDto,
  ) {
    return this.paymentsService.getPaymentsByOperator(
      String(operatorUserId),
      query.page,
      query.limit,
    );
  }
}
