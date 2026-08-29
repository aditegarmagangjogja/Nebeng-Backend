import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { CheckpointsService } from './checkpoints.service';
import { CheckpointsRepository } from './repository/checkpoints.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  OrderType,
  ScanType,
  TripStatus,
  OrderStatus,
  EscrowStatus,
} from '../../generated/prisma/enums';

describe('CheckpointsService', () => {
  let service: CheckpointsService;
  let repository: jest.Mocked<CheckpointsRepository>;

  const mockTrip = {
    id: BigInt(100),
    mitraId: BigInt(99),
    originPointId: BigInt(5),
    destinationPointId: BigInt(10),
    qrCodeTrip: 'TRIP-12345678',
    status: TripStatus.scheduled,
    originPoint: { id: BigInt(5), name: 'Pos Asal' },
    destinationPoint: { id: BigInt(10), name: 'Pos Tujuan' },
  };

  const mockOrderPassenger = {
    id: BigInt(1),
    tripId: BigInt(100), // Terhubung ke trip 100
    customerId: BigInt(20),
    type: OrderType.passenger,
    qrCodeTicket: 'TKT-12345678',
    totalPrice: '50000.00' as any,
    otpClaim: null,
    status: OrderStatus.paid,
    escrowStatus: EscrowStatus.held,
    itemOrders: [],
  };

  const mockOrderParcel = {
    ...mockOrderPassenger,
    id: BigInt(2),
    type: OrderType.parcel,
    otpClaim: '654321', // Membutuhkan OTP Klaim 6-digit
  };

  const mockCheckpointLog = {
    id: BigInt(1000),
    tripId: BigInt(100),
    orderId: BigInt(1),
    posId: BigInt(5),
    scannedByUserId: BigInt(88),
    scanType: ScanType.checkin_origin,
    createdAt: new Date(),
    trip: mockTrip,
    order: mockOrderPassenger,
    pos: { id: BigInt(5), name: 'Pos Asal' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      findTripByQr: jest.fn(),
      findOrderByQr: jest.fn(),
      processCheckinOrigin: jest.fn(),
      processCheckinDestinationAndReleaseEscrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckpointsService,
        { provide: CheckpointsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<CheckpointsService>(CheckpointsService);
    repository = module.get(
      CheckpointsRepository,
    ) as jest.Mocked<CheckpointsRepository>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('scanCheckpoint (Proses Scan QR Checkpoint Pos)', () => {
    it('harus berhasil memproses Check-in Origin di Pos Asal yang sesuai', async () => {
      const dto = {
        qrCodeTrip: 'TRIP-12345678',
        qrCodeTicket: 'TKT-12345678',
        posId: '5', // Pos ID cocok dengan originPointId (5)
        scanType: ScanType.checkin_origin,
        securitySealQr: 'SEAL-999',
      };

      repository.findTripByQr.mockResolvedValue(mockTrip as any);
      repository.findOrderByQr.mockResolvedValue(mockOrderPassenger as any);
      repository.processCheckinOrigin.mockResolvedValue(
        mockCheckpointLog as any,
      );

      const result = await service.scanCheckpoint('88', dto as any);

      expect(repository.findTripByQr).toHaveBeenCalledWith('TRIP-12345678');
      expect(repository.findOrderByQr).toHaveBeenCalledWith('TKT-12345678');
      expect(repository.processCheckinOrigin).toHaveBeenCalledWith(
        BigInt(100),
        BigInt(1),
        '5',
        '88',
        'SEAL-999',
      );
      expect(result).toHaveProperty('checkpoint');
      expect(result.message).toContain('Check-in Pos Asal berhasil');
    });

    it('harus berhasil memproses Check-in Destination dan mencairkan dana Escrow jika OTP parcel benar', async () => {
      const dto = {
        qrCodeTrip: 'TRIP-12345678',
        qrCodeTicket: 'TKT-12345678',
        posId: '10', // Pos ID cocok dengan destinationPointId (10)
        scanType: ScanType.checkin_destination,
        otpClaim: '654321', // OTP cocok
      };

      const destLog = {
        ...mockCheckpointLog,
        scanType: ScanType.checkin_destination,
        posId: BigInt(10),
      };

      repository.findTripByQr.mockResolvedValue(mockTrip as any);
      repository.findOrderByQr.mockResolvedValue(mockOrderParcel as any);
      repository.processCheckinDestinationAndReleaseEscrow.mockResolvedValue(
        destLog as any,
      );

      const result = await service.scanCheckpoint('88', dto as any);

      expect(
        repository.processCheckinDestinationAndReleaseEscrow,
      ).toHaveBeenCalledWith(
        BigInt(100),
        BigInt(2),
        '10',
        '88',
        BigInt(99),
        50000,
      );
      expect(result.message).toContain(
        'Check-in Pos Tujuan & Penyerahan berhasil',
      );
    });

    it('harus melemparkan NotFoundException jika QR Code Trip tidak ditemukan', async () => {
      repository.findTripByQr.mockResolvedValue(null);

      await expect(
        service.scanCheckpoint('88', {
          qrCodeTrip: 'SALAH',
          qrCodeTicket: 'TKT-12345678',
          posId: '5',
          scanType: ScanType.checkin_origin,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus melemparkan NotFoundException jika QR Code Tiket/Order tidak ditemukan', async () => {
      repository.findTripByQr.mockResolvedValue(mockTrip as any);
      repository.findOrderByQr.mockResolvedValue(null);

      await expect(
        service.scanCheckpoint('88', {
          qrCodeTrip: 'TRIP-12345678',
          qrCodeTicket: 'SALAH',
          posId: '5',
          scanType: ScanType.checkin_origin,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus melemparkan BadRequestException jika Tiket/Order tidak terdaftar pada Trip tersebut', async () => {
      repository.findTripByQr.mockResolvedValue(mockTrip as any);
      repository.findOrderByQr.mockResolvedValue({
        ...mockOrderPassenger,
        tripId: BigInt(999), // Terhubung ke Trip ID lain
      } as any);

      await expect(
        service.scanCheckpoint('88', {
          qrCodeTrip: 'TRIP-12345678',
          qrCodeTicket: 'TKT-12345678',
          posId: '5',
          scanType: ScanType.checkin_origin,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus melemparkan BadRequestException jika Check-in Origin dilakukan bukan di Pos Asal yang sesuai', async () => {
      repository.findTripByQr.mockResolvedValue(mockTrip as any); // originPointId: 5
      repository.findOrderByQr.mockResolvedValue(mockOrderPassenger as any);

      await expect(
        service.scanCheckpoint('88', {
          qrCodeTrip: 'TRIP-12345678',
          qrCodeTicket: 'TKT-12345678',
          posId: '99', // Pos 99 bukan Pos Asal (5)
          scanType: ScanType.checkin_origin,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus melemparkan BadRequestException jika Check-in Destination dilakukan bukan di Pos Tujuan yang sesuai', async () => {
      repository.findTripByQr.mockResolvedValue(mockTrip as any); // destinationPointId: 10
      repository.findOrderByQr.mockResolvedValue(mockOrderPassenger as any);

      await expect(
        service.scanCheckpoint('88', {
          qrCodeTrip: 'TRIP-12345678',
          qrCodeTicket: 'TKT-12345678',
          posId: '5', // Pos 5 bukan Pos Tujuan (10)
          scanType: ScanType.checkin_destination,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus melemparkan BadRequestException jika klaim paket (parcel) tidak menyertakan kode OTP', async () => {
      repository.findTripByQr.mockResolvedValue(mockTrip as any);
      repository.findOrderByQr.mockResolvedValue(mockOrderParcel as any);

      await expect(
        service.scanCheckpoint('88', {
          qrCodeTrip: 'TRIP-12345678',
          qrCodeTicket: 'TKT-12345678',
          posId: '10',
          scanType: ScanType.checkin_destination,
          otpClaim: '', // OTP kosong
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus melemparkan BadRequestException jika kode OTP klaim paket tidak cocok', async () => {
      repository.findTripByQr.mockResolvedValue(mockTrip as any);
      repository.findOrderByQr.mockResolvedValue(mockOrderParcel as any); // OTP Asli: 654321

      await expect(
        service.scanCheckpoint('88', {
          qrCodeTrip: 'TRIP-12345678',
          qrCodeTicket: 'TKT-12345678',
          posId: '10',
          scanType: ScanType.checkin_destination,
          otpClaim: '000000', // OTP Salah
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
