import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Role,
  UserStatus,
  VerificationStatus,
  VehicleType,
} from '../../../generated/prisma/enums';

export class VehicleSummaryDto {
  @ApiProperty({ example: '501' })
  id!: string;

  @ApiProperty({ enum: VehicleType })
  type!: VehicleType;

  @ApiProperty({ example: 'Beat' })
  model!: string;

  @ApiProperty({ example: 'AD1234ABC' })
  plateNumber!: string;

  @ApiProperty({ example: 'Hitam' })
  color!: string;

  @ApiProperty({ example: 1 })
  capacitySeats!: number;

  @ApiProperty({ example: 15 })
  maxWeightCapacityKg!: number;
}

export class UserResponseDto {
  @ApiProperty({ example: '1029103840' })
  id!: string;

  @ApiPropertyOptional({ example: '1' })
  regionId?: string | null;

  @ApiProperty({ example: 'Jhons' })
  name!: string;

  @ApiProperty({ example: 'jhon@gmail.com' })
  email!: string;

  @ApiProperty({ example: '1029391032211' })
  phone!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ enum: VerificationStatus })
  statusVerification!: VerificationStatus;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatar?: string | null;

  @ApiProperty({ example: 0 })
  rewardPoints!: number;

  @ApiPropertyOptional({ type: [VehicleSummaryDto] })
  vehicles?: VehicleSummaryDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}