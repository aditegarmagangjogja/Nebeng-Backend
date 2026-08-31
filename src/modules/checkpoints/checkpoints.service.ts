import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CheckpointsRepository } from './repository/checkpoints.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { ScanCheckpointDto } from './dto/scan-checkpoint.dto';
import { CheckpointMapper } from './mappers/checkpoint.mapper';
import {
  EscrowStatus,
  OrderStatus,
  OrderType,
  Role,
  ScanType,
  ServiceType,
} from '../../generated/prisma/enums';

@Injectable()
export class CheckpointsService {
  constructor(
    private readonly checkpointsRepository: CheckpointsRepository,
    private readonly prisma: PrismaService,
  ) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async scanCheckpoint(currentUser: any, dto: ScanCheckpointDto) {
    const operatorUserIdStr = String(currentUser.id);
    if (
      currentUser.role === Role.operator_pos ||
      currentUser.role === 'operator_pos'
    ) {
      const parsedOperatorId = this.safeParseBigInt(operatorUserIdStr);
      if (parsedOperatorId) {
        const assignedPos = await this.prisma.pickupPoint.findFirst({
          where: {
            id: this.safeParseBigInt(dto.posId) || BigInt(0),
            operatorId: parsedOperatorId,
          },
        });

        if (!assignedPos) {
          throw new ForbiddenException(
            'Anda tidak memiliki otoritas bertugas di Pos Checkpoint ini.',
          );
        }
      }
    }

    const trip = await this.checkpointsRepository.findTripByQr(dto.qrCodeTrip);
    if (!trip) {
      throw new NotFoundException(
        'Data Trip dengan QR tersebut tidak ditemukan.',
      );
    }

    const order = await this.checkpointsRepository.findOrderByQr(
      dto.qrCodeTicket,
    );
    if (!order) {
      throw new NotFoundException(
        'Data Tiket/Order dengan QR tersebut tidak ditemukan.',
      );
    }

    if (order.tripId !== trip.id) {
      throw new BadRequestException(
        'Tiket/Order ini tidak terdaftar pada Trip ini.',
      );
    }

    if (dto.scanType === ScanType.checkin_origin) {
      if (order.status !== OrderStatus.paid) {
        throw new BadRequestException(
          'Pesanan belum dibayar atau sudah melalui proses check-in.',
        );
      }

      if (trip.originPointId.toString() !== dto.posId) {
        throw new BadRequestException(
          'Proses Check-in Origin harus dilakukan di Pos Asal yang sesuai.',
        );
      }

      const log = await this.checkpointsRepository.processCheckinOrigin(
        trip.id,
        order.id,
        dto.posId,
        operatorUserIdStr,
        dto.securitySealQr,
      );

      return {
        message:
          'Check-in Pos Asal berhasil. Status Trip dan Order kini IN_TRANSIT.',
        checkpoint: CheckpointMapper.toResponse(log),
      };
    }

    if (dto.scanType === ScanType.checkin_destination) {
      if (order.escrowStatus !== EscrowStatus.held) {
        throw new BadRequestException(
          'Dana escrow order ini sudah dicairkan atau tidak dalam status ditahan.',
        );
      }

      if (trip.destinationPointId.toString() !== dto.posId) {
        throw new BadRequestException(
          'Proses Check-in Destination harus dilakukan di Pos Tujuan yang sesuai.',
        );
      }

      if (order.type === OrderType.parcel) {
        if (!dto.otpClaim) {
          throw new BadRequestException(
            'Kode OTP Klaim penerima wajib diisi untuk penyerahan paket.',
          );
        }
        if (order.otpClaim !== dto.otpClaim) {
          throw new BadRequestException(
            'Kode OTP Klaim yang dimasukkan salah/tidak cocok.',
          );
        }
      }

      const serviceType =
        order.type === OrderType.parcel
          ? ServiceType.barang
          : ServiceType.mobil;
      const pricingSetting = await this.prisma.pricingSetting.findFirst({
        where: { serviceType },
      });
      const adminFeePercentage = pricingSetting
        ? Number(pricingSetting.adminFeePercentage)
        : 10;

      const totalPriceNum = Number(order.totalPrice);

      const log =
        await this.checkpointsRepository.processCheckinDestinationAndReleaseEscrow(
          trip.id,
          order.id,
          dto.posId,
          operatorUserIdStr,
          trip.mitraId,
          order.customerId,
          totalPriceNum,
          adminFeePercentage,
        );

      return {
        message:
          'Check-in Pos Tujuan & Penyerahan berhasil. Transaksi Selesai, Dana Escrow telah dicairkan ke Wallet Mitra, dan Poin Reward berhasil ditambahkan.',
        checkpoint: CheckpointMapper.toResponse(log),
      };
    }

    throw new BadRequestException('Jenis Scan Type tidak valid.');
  }

  async manualForceReleaseByOperator(
    currentUser: any,
    qrCodeTicket: string,
    posId: string,
    otpClaim?: string,
  ) {
    const operatorUserIdStr = String(currentUser.id);

    const assignedPos = await this.prisma.pickupPoint.findFirst({
      where: {
        id: this.safeParseBigInt(posId) || BigInt(0),
        operatorId: this.safeParseBigInt(operatorUserIdStr),
      },
    });

    if (
      !assignedPos &&
      currentUser.role !== Role.superadmin &&
      currentUser.role !== Role.admin_wilayah
    ) {
      throw new ForbiddenException(
        'Anda tidak memiliki otoritas bertugas di Pos ini.',
      );
    }

    const order = await this.checkpointsRepository.findOrderByQr(qrCodeTicket);
    if (!order) {
      throw new NotFoundException('Tiket/Order tidak ditemukan.');
    }

    if (order.escrowStatus !== EscrowStatus.held) {
      throw new BadRequestException(
        'Escrow order ini sudah dicairkan atau tidak dalam status ditahan.',
      );
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: order.tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip terkait tidak ditemukan.');
    }

    if (
      order.type === OrderType.parcel &&
      order.otpClaim &&
      order.otpClaim !== otpClaim
    ) {
      throw new BadRequestException('Kode OTP Klaim paket tidak cocok.');
    }

    const pricingSetting = await this.prisma.pricingSetting.findFirst({
      where: {
        serviceType:
          order.type === OrderType.parcel
            ? ServiceType.barang
            : ServiceType.mobil,
      },
    });
    const adminFeePercentage = pricingSetting
      ? Number(pricingSetting.adminFeePercentage)
      : 10;
    const totalPriceNum = Number(order.totalPrice);

    const log =
      await this.checkpointsRepository.processManualForceCompleteAndRelease(
        trip.id,
        order.id,
        posId,
        operatorUserIdStr,
        trip.mitraId,
        order.customerId,
        totalPriceNum,
        adminFeePercentage,
      );

    return {
      message:
        'Force Check-in & Pencairan Escrow manual oleh Operator Pos berhasil dilakukan.',
      checkpoint: CheckpointMapper.toResponse(log),
    };
  }
}
