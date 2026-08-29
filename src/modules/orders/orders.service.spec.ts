import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './repository/orders.repository';
import { TripsRepository } from '../trips/repository/trips.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  OrderType,
  TripStatus,
  EscrowStatus,
  OrderStatus,
} from '../../generated/prisma/enums';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepository: jest.Mocked<OrdersRepository>;
  let tripsRepository: jest.Mocked<TripsRepository>;

  const mockTrip = {
    id: BigInt(100),
    mitraId: BigInt(99),
    price: '50000.00' as any,
    seatAvailable: 3,
    remainingWeightCapacityKg: '20.00' as any,
    status: TripStatus.scheduled,
  };

  const mockOrder = {
    id: BigInt(1),
    tripId: BigInt(100),
    customerId: BigInt(10),
    type: OrderType.passenger,
    seatsBooked: 2,
    totalItemsCount: 0,
    totalWeightKg: '0.00' as any,
    totalPrice: '100000.00' as any,
    qrCodeTicket: 'TKT-12345678',
    otpClaim: null,
    status: OrderStatus.pending_payment,
    escrowStatus: EscrowStatus.pending,
    createdAt: new Date(),
    updatedAt: new Date(),
    trip: {
      ...mockTrip,
      originPoint: { id: BigInt(1), name: 'Pos Origin' },
      destinationPoint: { id: BigInt(2), name: 'Pos Dest' },
      mitra: { id: BigInt(99), name: 'Mitra Test' },
    },
    customer: { id: BigInt(10), name: 'Customer Test' },
    itemOrders: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockOrdersRepo = {
      createOrderWithTransaction: jest.fn(),
      findByCustomerId: jest.fn(),
      findById: jest.fn(),
      findByTicketQr: jest.fn(),
      updateStatus: jest.fn(),
    };

    const mockTripsRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: mockOrdersRepo },
        { provide: TripsRepository, useValue: mockTripsRepo },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    ordersRepository = module.get(
      OrdersRepository,
    ) as jest.Mocked<OrdersRepository>;
    tripsRepository = module.get(
      TripsRepository,
    ) as jest.Mocked<TripsRepository>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder (Pembuatan Pesanan Baru)', () => {
    it('harus berhasil membuat pemesanan tiket penumpang (passenger) jika sisa kursi mencukupi', async () => {
      const dto = {
        tripId: '100',
        type: OrderType.passenger,
        seatsBooked: 2,
      };

      tripsRepository.findById.mockResolvedValue(mockTrip as any);
      ordersRepository.findByTicketQr.mockResolvedValue(null);
      ordersRepository.createOrderWithTransaction.mockResolvedValue(
        mockOrder as any,
      );

      const result = await service.createOrder('10', dto as any);

      expect(tripsRepository.findById).toHaveBeenCalledWith('100');
      expect(ordersRepository.createOrderWithTransaction).toHaveBeenCalledWith(
        '100',
        '10',
        expect.objectContaining({
          type: OrderType.passenger,
          seatsBooked: 2,
          totalPrice: 100000,
        }),
        [],
        2,
        0,
      );
      expect(result).toBeDefined();
      expect(result?.id).toEqual('1');
    });

    it('harus berhasil membuat pemesanan kirim paket (parcel) dan menggenerasi OTP claim 6-digit', async () => {
      const dto = {
        tripId: '100',
        type: OrderType.parcel,
        items: [
          {
            itemName: 'Dokumen Penting',
            itemCategory: 'Dokumen',
            quantity: 1,
            weightPerItemKg: 2,
            sizeEnum: 'small' as any,
            recipientName: 'Budi',
            recipientPhone: '081299998888',
          },
        ],
      };

      const mockParcelOrder = {
        ...mockOrder,
        type: OrderType.parcel,
        seatsBooked: 0,
        totalItemsCount: 1,
        totalWeightKg: '2.00' as any,
        totalPrice: '100000.00' as any,
        otpClaim: '123456',
      };

      tripsRepository.findById.mockResolvedValue(mockTrip as any);
      ordersRepository.findByTicketQr.mockResolvedValue(null);
      ordersRepository.createOrderWithTransaction.mockResolvedValue(
        mockParcelOrder as any,
      );

      const result = await service.createOrder('10', dto as any);

      expect(ordersRepository.createOrderWithTransaction).toHaveBeenCalledWith(
        '100',
        '10',
        expect.objectContaining({
          type: OrderType.parcel,
          totalItemsCount: 1,
          totalWeightKg: 2,
          otpClaim: expect.stringMatching(/^\d{6}$/),
        }),
        expect.any(Array),
        0,
        2,
      );
      expect(result).toBeDefined();
    });

    it('harus melemparkan BadRequestException jika Mitra mencoba memesan tiket pada trip miliknya sendiri', async () => {
      const dto = { tripId: '100', type: OrderType.passenger, seatsBooked: 1 };

      tripsRepository.findById.mockResolvedValue(mockTrip as any);

      await expect(service.createOrder('99', dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('harus melemparkan BadRequestException jika status trip bukan scheduled', async () => {
      const dto = { tripId: '100', type: OrderType.passenger, seatsBooked: 1 };

      tripsRepository.findById.mockResolvedValue({
        ...mockTrip,
        status: TripStatus.in_transit,
      } as any);

      await expect(service.createOrder('10', dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('harus melemparkan BadRequestException jika jumlah kursi yang dipesan melebihi sisa kursi yang tersedia', async () => {
      const dto = { tripId: '100', type: OrderType.passenger, seatsBooked: 5 };

      tripsRepository.findById.mockResolvedValue(mockTrip as any);

      await expect(service.createOrder('10', dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('harus melemparkan BadRequestException jika berat paket melebihi sisa kapasitas bagasi trip', async () => {
      const dto = {
        tripId: '100',
        type: OrderType.parcel,
        items: [
          {
            itemName: 'Barang Berat',
            itemCategory: 'Elektronik',
            quantity: 1,
            weightPerItemKg: 25,
            sizeEnum: 'large' as any,
            recipientName: 'Budi',
            recipientPhone: '081299998888',
          },
        ],
      };

      tripsRepository.findById.mockResolvedValue(mockTrip as any);

      await expect(service.createOrder('10', dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('harus melemparkan BadRequestException jika pemesanan jenis parcel tidak menyertakan daftar item', async () => {
      const dto = { tripId: '100', type: OrderType.parcel, items: [] };

      tripsRepository.findById.mockResolvedValue(mockTrip as any);

      await expect(service.createOrder('10', dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('harus melemparkan NotFoundException jika tripId tidak ditemukan', async () => {
      tripsRepository.findById.mockResolvedValue(null);

      await expect(
        service.createOrder('10', {
          tripId: '999',
          type: OrderType.passenger,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyOrders (Daftar Riwayat Pesanan Customer)', () => {
    it('harus mengembalikan daftar riwayat pesanan milik customer yang ter-map', async () => {
      ordersRepository.findByCustomerId.mockResolvedValue([mockOrder] as any);

      const result = await service.getMyOrders('10');

      expect(ordersRepository.findByCustomerId).toHaveBeenCalledWith('10');
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toEqual('1');
    });
  });

  describe('getOrderById (Detail Pesanan Berdasarkan ID)', () => {
    it('harus mengembalikan detail pesanan jika ID ditemukan', async () => {
      ordersRepository.findById.mockResolvedValue(mockOrder as any);

      const result = await service.getOrderById('1');

      expect(ordersRepository.findById).toHaveBeenCalledWith('1');
      expect(result?.id).toEqual('1');
    });

    it('harus melemparkan NotFoundException jika pesanan tidak ditemukan', async () => {
      ordersRepository.findById.mockResolvedValue(null);

      await expect(service.getOrderById('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
