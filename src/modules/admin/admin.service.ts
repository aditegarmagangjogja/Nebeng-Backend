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

    if (
      currentUser.role === Role.admin_wilayah ||
      currentUser.role === 'admin_wilayah'
    ) {
      if (!currentUser.regionId) {
        throw new ForbiddenException(
          'Admin Wilayah tidak memiliki penugasan wilayah.',
        );
      }
      regionId = currentUser.regionId.toString();
    } else if (
      currentUser.role === Role.superadmin ||
      currentUser.role === 'superadmin'
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
    currentAdminId: string,
    targetUserId: string,
    dto: UpdateUserGovernanceDto,
  ) {
    if (currentAdminId === targetUserId) {
      throw new BadRequestException(
        'Anda tidak dapat mengubah status akun sendiri.',
      );
    }

    const targetUser = await this.adminRepository.findUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('User sasaran tidak ditemukan.');
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
}
