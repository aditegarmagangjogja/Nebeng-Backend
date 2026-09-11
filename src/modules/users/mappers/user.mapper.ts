import { User } from '../../../generated/prisma/client';
import { UserResponseDto, VehicleSummaryDto } from '../dto/user-response.dto';

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
      avatar: user.avatar,
      rewardPoints: user.rewardPoints,
      vehicles: Array.isArray(user.vehicles)
        ? user.vehicles.map(
            (v: any): VehicleSummaryDto => ({
              id: v.id.toString(),
              type: v.type,
              model: v.model,
              plateNumber: v.plateNumber,
              color: v.color,
              capacitySeats: v.capacitySeats,
              maxWeightCapacityKg: Number(v.maxWeightCapacityKg),
            }),
          )
        : undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toResponseList(users: User[]): UserResponseDto[] {
    return users.map((user) => this.toResponse(user));
  }
}