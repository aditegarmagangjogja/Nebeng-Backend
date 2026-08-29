import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './repository/payments.repository';
import { OrdersRepository } from '../orders/repository/orders.repository';
import { WalletsService } from '../wallets/wallets.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  EscrowStatus,
  OrderStatus,
  PaymentStatus,
} from '../../generated/prisma/enums';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepository: jest.Mocked<PaymentsRepository>;
  let ordersRepository: jest.Mocked<OrdersRepository>;
  let walletsService: jest.Mocked<WalletsService>;

  const mockOrder = {
    id: BigInt(100),
    customerId: BigInt(10), // Customer ID: 10
    totalPrice: '150000.00' as any,
    status: OrderStatus.pending_payment,
    escrowStatus: EscrowStatus.pending,
  };

  const mockTrip = {
    id: BigInt(50),
    mitraId: BigInt(99), // Mitra ID: 99
  };

  const mockPaymentResult = {
    payment: {
      id: BigInt(1),
      orderId: BigInt(100),
      paymentGateway: 'midtrans',
      transactionId: 'TRX-12345678',
      amount: '150000.00' as any,
      status: PaymentStatus.success,
      createdAt: new Date(),
    },
    order: {
      ...mockOrder,
      status: OrderStatus.paid,
      escrowStatus: EscrowStatus.held,
      trip: mockTrip,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPaymentsRepo = {
      createPaymentAndUpdateOrder: jest.fn(),
    };

    const mockOrdersRepo = {
      findById: jest.fn(),
    };

    const mockWalletsService = {
      holdEscrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: mockPaymentsRepo },
        { provide: OrdersRepository, useValue: mockOrdersRepo },
        { provide: WalletsService, useValue: mockWalletsService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentsRepository = module.get(
      PaymentsRepository,
    ) as jest.Mocked<PaymentsRepository>;
    ordersRepository = module.get(
      OrdersRepository,
    ) as jest.Mocked<OrdersRepository>;
    walletsService = module.get(WalletsService) as jest.Mocked<WalletsService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('checkoutPayment (Proses Checkout Pembayaran Customer)', () => {
    it('harus berhasil memproses pembayaran, mengupdate status order, dan menahan dana di Escrow', async () => {
      const dto = { orderId: '100', paymentGateway: 'midtrans' };

      ordersRepository.findById.mockResolvedValue(mockOrder as any);
      paymentsRepository.createPaymentAndUpdateOrder.mockResolvedValue(
        mockPaymentResult as any,
      );
      walletsService.holdEscrow.mockResolvedValue(undefined);

      const result = await service.checkoutPayment('10', dto);

      expect(ordersRepository.findById).toHaveBeenCalledWith('100');
      expect(
        paymentsRepository.createPaymentAndUpdateOrder,
      ).toHaveBeenCalledWith(
        '100',
        'midtrans',
        expect.stringMatching(/^TRX-[A-Z0-9]{8}$/),
        150000,
      );
      expect(walletsService.holdEscrow).toHaveBeenCalledWith(
        '99',
        '100',
        150000,
      );
      expect(result).toHaveProperty('payment');
      expect(result.payment.status).toEqual(PaymentStatus.success);
    });

    it('harus melemparkan NotFoundException jika Order tidak ditemukan', async () => {
      ordersRepository.findById.mockResolvedValue(null);

      await expect(
        service.checkoutPayment('10', {
          orderId: '999',
          paymentGateway: 'gopay',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus melemparkan BadRequestException jika Order bukan milik Customer yang sedang login', async () => {
      ordersRepository.findById.mockResolvedValue(mockOrder as any); // customerId: 10

      await expect(
        service.checkoutPayment('999', {
          orderId: '100',
          paymentGateway: 'gopay',
        }), // User 999 mencoba bayar order user 10
      ).rejects.toThrow(BadRequestException);
    });

    it('harus melemparkan BadRequestException jika status Order tidak dalam kondisi pending_payment', async () => {
      ordersRepository.findById.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.paid, // Sudah dibayar sebelumnya
      } as any);

      await expect(
        service.checkoutPayment('10', {
          orderId: '100',
          paymentGateway: 'gopay',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
