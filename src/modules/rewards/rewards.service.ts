import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RewardsRepository } from './repository/rewards.repository';
import { EarnRewardDto } from './dto/earn-reward.dto';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { RewardMapper } from './mappers/reward.mapper';

@Injectable()
export class RewardsService {
  constructor(private readonly rewardsRepository: RewardsRepository) {}

  async earnPoints(dto: EarnRewardDto) {
    const user = await this.rewardsRepository.findUserById(dto.userId);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const { transaction } = await this.rewardsRepository.addRewardPoints({
      userIdStr: dto.userId,
      points: dto.points,
      description: dto.description || 'Penambahan poin reward',
    });

    return RewardMapper.toTransactionResponse(transaction);
  }

  async redeemPoints(currentUserId: string, dto: RedeemRewardDto) {
    const user = await this.rewardsRepository.findUserById(currentUserId);

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (user.rewardPoints < dto.points) {
      throw new BadRequestException(
        `Saldo poin Anda tidak mencukupi. Poin Anda saat ini ${user.rewardPoints}`,
      );
    }

    const { transaction } = await this.rewardsRepository.deductRewardPoints({
      userIdStr: currentUserId,
      points: dto.points,
      description: dto.description || 'Penukaran poin reward',
    });

    return RewardMapper.toTransactionResponse(transaction);
  }

  async getUserRewardSummary(currentUserId: string) {
    const user = await this.rewardsRepository.findUserById(currentUserId);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const history =
      await this.rewardsRepository.getRewardHistoryByUserId(currentUserId);

    return RewardMapper.toBalanceResponse(user, history);
  }
}
