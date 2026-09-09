import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Role,
  UserStatus,
  VerificationStatus,
} from '../../../generated/prisma/enums';

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

  @ApiPropertyOptional({ example: '3374123456789001' })
  nik?: string | null;

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

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
