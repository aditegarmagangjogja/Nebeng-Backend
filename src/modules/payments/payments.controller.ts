import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
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
}
