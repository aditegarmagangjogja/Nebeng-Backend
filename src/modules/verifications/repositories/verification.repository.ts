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
    profileData?: {
      ktpNumber?: string;
      fullNameKtp?: string;
      addressKtp?: string;
      faceImageUrl?: string;
    };
  }) {
    return this.prisma.$transaction(async (tx) => {
      if (data.profileData && Object.keys(data.profileData).length > 0) {
        await tx.userProfile.upsert({
          where: { userId: data.userId },
          update: {
            ...(data.profileData.ktpNumber
              ? { ktpNumber: data.profileData.ktpNumber }
              : {}),
            ...(data.profileData.fullNameKtp
              ? { fullNameKtp: data.profileData.fullNameKtp }
              : {}),
            ...(data.profileData.addressKtp
              ? { addressKtp: data.profileData.addressKtp }
              : {}),
            ...(data.profileData.faceImageUrl
              ? { faceImageUrl: data.profileData.faceImageUrl }
              : {}),
          },
          create: {
            userId: data.userId,
            ktpNumber: data.profileData.ktpNumber || null,
            fullNameKtp: data.profileData.fullNameKtp || null,
            addressKtp: data.profileData.addressKtp || null,
            faceImageUrl: data.profileData.faceImageUrl || null,
          },
        });
      }

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
          user: {
            include: { profile: true },
          },
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
        user: {
          include: { profile: true, vehicles: true },
        },
        approvedByUser: true,
      },
    });
  }

  async findAll(status?: VerificationStatus, regionId?: string) {
    const parsedRegionid = regionId ? this.safeParseBigInt(regionId) : null;

    return this.prisma.verification.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(parsedRegionid
          ? {
              OR: [
                { user: { regionId: parsedRegionid } },
                { user: { regionId: null } },
              ],
            }
          : {}),
      },
      include: {
        files: true,
        user: {
          include: { profile: true, vehicles: true },
        },
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
        include: {
          files: true,
          user: {
            include: { profile: true },
          },
        },
      });

      if (status === VerificationStatus.rejected) {
        await tx.user.update({
          where: { id: updatedVerfication.userId },
          data: { statusVerification: VerificationStatus.rejected },
        });
      } else if (status === VerificationStatus.approved) {
        const currentUserData = await tx.user.findUnique({
          where: { id: updatedVerfication.userId },
        });
        if (currentUserData && !currentUserData.regionId && parseAdminId) {
          const adminUser = await tx.user.findUnique({
            where: { id: parseAdminId },
          });
          if (adminUser?.regionId) {
            await tx.user.update({
              where: { id: updatedVerfication.userId },
              data: { regionId: adminUser.regionId },
            });
          }
        }

        await tx.userProfile.upsert({
          where: { userId: updatedVerfication.userId },
          update: { isFaceVerified: true },
          create: {
            userId: updatedVerfication.userId,
            isFaceVerified: true,
          },
        });

        // Opsi 1: Ubah status user langsung jadi approved saat salah satu verifikasi di-approve,
        // atau pastikan mengecek apakah SEMUA verifikasi milik user ini sudah tidak ada yang pending.
        const remainingPending = await tx.verification.count({
          where: {
            userId: updatedVerfication.userId,
            status: VerificationStatus.pending,
          },
        });

        // Jika sudah tidak ada lagi yang pending (semua sudah di-approve/reject), aktifkan user
        if (remainingPending === 0) {
          await tx.user.update({
            where: { id: updatedVerfication.userId },
            data: { statusVerification: VerificationStatus.approved },
          });
        }
      }

      return updatedVerfication;
    });
  }

  async findByUserId(userId: bigint) {
    return this.prisma.verification.findMany({
      where: { userId },
      include: { files: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
