import { UserResponseDto } from '../dto/user-response.dto';

export class UserMapper {
  static toResponse(user: any): UserResponseDto {
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toResponseList(users: any[]): UserResponseDto[] {
    return users.map((user) => this.toResponse(user));
  }
}
