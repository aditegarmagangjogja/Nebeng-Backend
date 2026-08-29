import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderType } from '../../generated/prisma/enums';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: jest.Mocked<OrdersService>;

  beforeEach(async () => {
    const mockService = {
      createOrder: jest.fn(),
      getMyOrders: jest.fn(),
      getOrderById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get(OrdersService) as jest.Mocked<OrdersService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /orders (Endpoint Buat Pesanan Baru)', () => {
    it('harus memanggil ordersService.createOrder dengan ID customer dan DTO', async () => {
      const dto = { tripId: '100', type: OrderType.passenger, seatsBooked: 2 };
      const expectedResponse = { id: '1', ...dto } as any;

      ordersService.createOrder.mockResolvedValue(expectedResponse);

      const result = await controller.createOrder('10', dto as any);

      expect(ordersService.createOrder).toHaveBeenCalledWith('10', dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /orders/me (Endpoint Riwayat Pesanan Saya)', () => {
    it('harus memanggil ordersService.getMyOrders dengan ID customer', async () => {
      ordersService.getMyOrders.mockResolvedValue([]);

      const result = await controller.getMyOrders('10');

      expect(ordersService.getMyOrders).toHaveBeenCalledWith('10');
      expect(result).toEqual([]);
    });
  });

  describe('GET /orders/:id (Endpoint Detail Pesanan)', () => {
    it('harus memanggil ordersService.getOrderById dengan ID pesanan', async () => {
      const expectedResponse = { id: '1', totalPrice: 100000 } as any;
      ordersService.getOrderById.mockResolvedValue(expectedResponse);

      const result = await controller.getOrderById('1');

      expect(ordersService.getOrderById).toHaveBeenCalledWith('1');
      expect(result).toEqual(expectedResponse);
    });
  });
});
