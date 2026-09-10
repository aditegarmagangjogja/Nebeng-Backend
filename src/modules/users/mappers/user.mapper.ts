import { UserResponseDto } from '../dto/user-response.dto';

export class UserMapper {
  static toResponse(user: any): UserResponseDto {
    let calculatedRating: number | null = null;
    let reviewCount = 0;

    if (
      user.reviewsReceived &&
      Array.isArray(user.reviewsReceived) &&
      user.reviewsReceived.length > 0
    ) {
      reviewCount = user.reviewsReceived.length;
      const sum = user.reviewsReceived.reduce(
        (acc: number, curr: any) => acc + Number(curr.rating || 0),
        0,
      );
      calculatedRating = Number((sum / reviewCount).toFixed(1));
    }

    return {
      id: user.id.toString(),
      regionId: user.regionId ? user.regionId.toString() : null,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      statusVerification: user.statusVerification,
      nik: user.profile?.ktpNumber || user.nik || null,
      avatar: user.avatar,
      rewardPoints: user.rewardPoints,
      rating: calculatedRating,
      totalReviews: reviewCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toResponseList(users: any[]): UserResponseDto[] {
    return users.map((user) => this.toResponse(user));
  }
}
