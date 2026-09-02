import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { AdminMapper } from './mappers/admin.mapper';
import { UpdateUserGovernanceDto } from './dto/update-user-governance.dto';
import { Role } from '../../generated/prisma/enums';

@Injectable()
export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async getGlobalDashboard() {
    const analytics = await this.adminRepository.getGlobalAnalytics();
    return AdminMapper.toGlobalDashboardResponse(analytics);
  }

  async getRegionalDashboard(currentUser: any, targetRegionId?: string) {
    let regionId: string;

    if (currentUser.role === Role.regional || currentUser.role === 'regional') {
      if (!currentUser.regionId) {
        throw new ForbiddenException(
          'Admin Wilayah tidak memiliki penugasan wilayah.',
        );
      }
      regionId = currentUser.regionId.toString();
    } else if (
      currentUser.role === Role.admin ||
      currentUser.role === 'admin'
    ) {
      if (!targetRegionId) {
        throw new BadRequestException(
          'Parameter targetRegionId diperlukan untuk superadmin.',
        );
      }
      regionId = targetRegionId;
    } else {
      throw new ForbiddenException('Akses ditolak.');
    }

    const analytics = await this.adminRepository.getRegionalAnalytics(regionId);
    return AdminMapper.toRegionalDashboardResponse(analytics);
  }

  async getEscrowLedger() {
    const ledger = await this.adminRepository.getEscrowLedger();
    return AdminMapper.toEscrowLedgerResponse(ledger);
  }

  async updateUserGovernance(
    currentUser: any,
    targetUserId: string,
    dto: UpdateUserGovernanceDto,
  ) {
    const currentAdminId = String(currentUser.id);

    if (currentAdminId === targetUserId) {
      throw new BadRequestException(
        'Anda tidak dapat mengubah status akun sendiri.',
      );
    }

    const targetUser = await this.adminRepository.findUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('User sasaran tidak ditemukan.');
    }

    if (currentUser.role === Role.regional || currentUser.role === 'regional') {
      if (targetUser.role === Role.admin || targetUser.role === Role.regional) {
        throw new ForbiddenException(
          'Admin Wilayah tidak dapat mengubah status Superadmin atau sesama Admin Wilayah.',
        );
      }

      if (
        targetUser.regionId &&
        currentUser.regionId &&
        targetUser.regionId.toString() !== currentUser.regionId.toString()
      ) {
        throw new ForbiddenException(
          'Anda hanya dapat mengubah status user di wilayah Anda sendiri.',
        );
      }
    }

    const updatedUser = await this.adminRepository.updateUserStatus(
      targetUserId,
      dto.status,
    );

    return {
      message: `Status pengguna berhasil diperbarui menjadi ${updatedUser.status}`,
      userId: updatedUser.id.toString(),
      status: updatedUser.status,
    };
  }

  async updatePlatformCommission(percentage: number) {
    await this.adminRepository.updatePlatformCommissionRate(percentage);

    return {
      message:
        'Persentase komisi platform berhasil diperbarui di database global',
      commissionPercentage: percentage,
    };
  }

  async updateRewardSetting(pointsMultiplier: number) {
    if (pointsMultiplier <= 0) {
      throw new BadRequestException(
        'Nilai kelipatan poin reward harus lebih besar dari 0.',
      );
    }

    await this.adminRepository.updateRewardSetting(pointsMultiplier);

    return {
      message: 'Pengaturan kelipatan Poin Reward berhasil diperbarui',
      rewardPointsMultiplier: pointsMultiplier,
    };
  }

  async updateRegionRate(
    currentUser: any,
    regionId: string,
    pricePerKm: number,
  ) {
    if (currentUser.role === Role.regional || currentUser.role === 'regional') {
      if (
        !currentUser.regionId ||
        currentUser.regionId.toString() !== regionId
      ) {
        throw new ForbiddenException(
          'Anda tidak memiliki akses untuk mengubah tarif wilayah lain.',
        );
      }
    }

    const updatedRegion = await this.adminRepository.updateRegionPriceRate(
      regionId,
      pricePerKm,
    );

    if (!updatedRegion) {
      throw new NotFoundException('Wilayah sasaran tidak ditemukan.');
    }

    return {
      message: `Tarif per Km untuk wilayah ${updatedRegion.name} berhasil diperbarui`,
      regionId: updatedRegion.id.toString(),
      pricePerKm: Number(updatedRegion.pricePerKm),
    };
  }
}
