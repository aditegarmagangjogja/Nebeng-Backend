import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    const mockService = {
      checkoutPayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(
      PaymentsService,
    ) as jest.Mocked<PaymentsService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /payments/checkout (Endpoint Checkout Pembayaran)', () => {
    it('harus memanggil paymentsService.checkoutPayment dengan userId Customer dan DTO', async () => {
      const dto = { orderId: '100', paymentGateway: 'midtrans' };
      const expectedResponse = {
        message:
          'Pembayaran berhasil dikonfirmasi dan dana telah ditahan oleh Escrow System.',
        payment: {
          id: '1',
          transactionId: 'TRX-12345678',
          amount: 150000,
          status: 'success',
        },
      } as any;

      paymentsService.checkoutPayment.mockResolvedValue(expectedResponse);

      const result = await controller.checkoutPayment('10', dto);

      expect(paymentsService.checkoutPayment).toHaveBeenCalledWith('10', dto);
      expect(result).toEqual(expectedResponse);
    });
  });
});
