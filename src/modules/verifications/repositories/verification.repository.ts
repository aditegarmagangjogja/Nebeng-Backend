import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  VerificationStatus,
  VerificationType,
} from '../../../generated/prisma/enums';

@Injectable()
export class VerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async findPendingOrApprovedByUserId(userId: bigint, type: VerificationType) {
    return this.prisma.verification.findFirst({
      where: {
        userId,
        type,
        status: {
          in: [VerificationStatus.pending, VerificationStatus.approved],
        },
      },
    });
  }

  async createVerification(data: {
    userId: bigint;
    type: VerificationType;
    files: { filePath: string; fileType: string }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const verification = await tx.verification.create({
        data: {
          userId: data.userId,
          type: data.type,
          status: VerificationStatus.pending,
          files: {
            create: data.files,
          },
        },
        include: {
          files: true,
        },
      });

      await tx.user.update({
        where: { id: data.userId },
        data: {
          statusVerification: VerificationStatus.pending,
        },
      });

      return verification;
    });
  }

  async findById(id: string) {
    const parseId = this.safeParseBigInt(id);
    if (!parseId) return null;

    return this.prisma.verification.findUnique({
      where: { id: parseId },
      include: {
        files: true,
        user: true,
      },
    });
  }

  async findAll(status?: VerificationStatus, regionId?: string) {
    const parsedRegionid = regionId ? this.safeParseBigInt(regionId) : null;

    return this.prisma.verification.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(parsedRegionid ? { user: { regionId: parsedRegionid } } : {}),
      },
      include: {
        files: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReviewStatus(
    id: string,
    adminId: string,
    status: VerificationStatus,
    rejectionReason?: string,
  ) {
    const parseid = this.safeParseBigInt(id);
    const parseAdminId = this.safeParseBigInt(adminId);

    if (!parseid) {
      throw new BadRequestException('Format id tidak valid');
    }

    if (!parseAdminId) {
      throw new BadRequestException('Format Id admin pengulas tidak valid');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedVerfication = await tx.verification.update({
        where: { id: parseid },
        data: {
          status,
          approvedByUserId: parseAdminId,
          rejectionReason:
            status === VerificationStatus.rejected ? rejectionReason : null,
        },
        include: { files: true, user: true },
      });

      if (status === VerificationStatus.rejected) {
        await tx.user.update({
          where: { id: updatedVerfication.userId },
          data: { statusVerification: VerificationStatus.rejected },
        });
      } else if (status === VerificationStatus.approved) {
        const pendingOrRejected = await tx.verification.count({
          where: {
            userId: updatedVerfication.userId,
            status: {
              in: [VerificationStatus.pending, VerificationStatus.rejected],
            },
          },
        });

        if (pendingOrRejected === 0) {
          await tx.user.update({
            where: { id: updatedVerfication.userId },
            data: { statusVerification: VerificationStatus.approved },
          });
        }
      }

      return updatedVerfication;
    });
  }
}
