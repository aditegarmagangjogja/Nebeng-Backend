import {
  BadRequestException,
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

  private safeParseBigInt(
    id: string | number | undefined | null,
  ): bigint | null {
    if (!id) return null;
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  private async resolvePosId(
    currentUser: any,
    providedPosId?: string,
  ): Promise<string> {
    const operatorUserIdStr = String(currentUser.id);
    const parsedOperatorId = this.safeParseBigInt(operatorUserIdStr);

    const assignedPos = await this.prisma.pickupPoint.findFirst({
      where: { operatorId: parsedOperatorId },
    });

    if (providedPosId) {
      if (currentUser.role === Role.operator) {
        const targetPos = await this.prisma.pickupPoint.findUnique({
          where: { id: BigInt(providedPosId) },
        });
        if (!targetPos) {
          throw new NotFoundException('Pos Checkpoint tidak ditemukan.');
        }
      }
      return providedPosId;
    }

    if (assignedPos) {
      return assignedPos.id.toString();
    }

    throw new BadRequestException(
      'ID Pos tidak ditemukan. Pastikan Anda sudah ditugaskan ke sebuah Pos Checkpoint.',
    );
  }

  async scanCheckpoint(currentUser: any, dto: ScanCheckpointDto) {
    const targetPosId = await this.resolvePosId(currentUser, dto.posId);
    const operatorUserIdStr = String(currentUser.id);

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

      if (trip.originPointId.toString() !== targetPosId) {
        throw new BadRequestException(
          'Proses Check-in Origin harus dilakukan di Pos Asal yang sesuai.',
        );
      }

      const log = await this.checkpointsRepository.processCheckinOrigin(
        trip.id,
        order.id,
        targetPosId,
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

      if (trip.destinationPointId.toString() !== targetPosId) {
        throw new BadRequestException(
          'Proses Check-in Destination harus dilakukan di Pos Tujuan yang sesuai.',
        );
      }

      // Validasi OTP hanya wajib jika order bertipe parcel/barang
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
          targetPosId,
          operatorUserIdStr,
          trip.mitraId,
          order.customerId,
          totalPriceNum,
          adminFeePercentage,
        );

      return {
        message:
          order.type === OrderType.parcel
            ? 'Check-in Pos Tujuan & Penyerahan Barang berhasil. Dana Escrow dicairkan.'
            : 'Check-in Pos Tujuan Penumpang berhasil. Transaksi Selesai & Dana Escrow dicairkan ke Wallet Mitra.',
        checkpoint: CheckpointMapper.toResponse(log),
      };
    }
  }

  async manualForceReleaseByOperator(
    currentUser: any,
    qrCodeTicket: string,
    posId?: string,
    otpClaim?: string,
  ) {
    const targetPosId = await this.resolvePosId(currentUser, posId);
    const operatorUserIdStr = String(currentUser.id);

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
        targetPosId,
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
