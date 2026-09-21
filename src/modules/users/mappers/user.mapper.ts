import { User } from '../../../generated/prisma/client';
import { UserResponseDto } from '../dto/user-response.dto';

export class UserMapper {
  static toResponse(user: User): UserResponseDto {
    return {
      id: user.id.toString(),
      regionId: user.regionId ? user.regionId.toString() : null,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      statusVerification: user.statusVerification,
<<<<<<< Updated upstream
      avatar: user.avatar,
      rewardPoints: user.rewardPoints,
=======
      nik: user.profile?.ktpNumber || user.nik || null,
      avatar: user.avatar || null,
      rewardPoints: Number(user.rewardPoints || 0),
      rating: calculatedRating,
      totalReviews: reviewCount,
      bankName: user.profile?.bankName || null,
      bankAccountNumber: user.profile?.bankAccountNumber || null,
      bankAccountHolder: user.profile?.bankAccountHolder || null,
      hasPin: Boolean(user.pinHash),
>>>>>>> Stashed changes
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toResponseList(users: User[]): UserResponseDto[] {
    return users.map((user) => this.toResponse(user));
  }
}
