import { IsString, IsUrl, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { Role } from '../../../generated/prisma/enums';

export class CreateBannerDto {
  @IsString()
  title: string;

  @IsUrl()
  imageUrl: string;

  @IsOptional()
  @IsUrl()
  linkUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(Role)
  targetRole?: Role;
}
