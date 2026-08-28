import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { GetUser } from '../../common/decorators/get-user.decorators';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.customer)
  @ApiOperation({ summary: 'Buat pesanan baru (Passenger / Parcel Booking)' })
  @ApiResponse({ status: 201, description: 'pesanan berhasil dibuat' })
  @ApiResponse({
    status: 400,
    description:
      'Sisa kursi/bagasi tidak mencukupi atau mencoba memesan di trip sendiri',
  })
  @ApiResponse({ status: 404, description: 'Jadwal trip tidak ditemukan' })
  async createOrder(@GetUser('id') user: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(String(user), dto);
  }

  @Get('me')
  @Roles(Role.customer)
  @ApiOperation({
    summary: 'Daftar riwayat pesanan milik Customer yang sedang login',
  })
  @ApiResponse({ status: 200, description: 'Daftar pesanan ditemukan' })
  async getMyOrders(@GetUser('id') user: string) {
    return this.ordersService.getMyOrders(String(user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail pesanan berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail pesanan ditemukan' })
  @ApiResponse({ status: 404, description: 'Order tidak ditemukan' })
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }
}
