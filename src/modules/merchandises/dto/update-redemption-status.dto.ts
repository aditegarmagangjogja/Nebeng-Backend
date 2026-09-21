import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RedemptionStatus } from '../../../generated/prisma/enums';

export class UpdateRedemptionStatusDto {
  @ApiProperty({ enum: RedemptionStatus, example: 'processing' })
  @IsEnum(RedemptionStatus, { message: 'Status klaim penukaran tidak valid' })
  status!: RedemptionStatus;

  @ApiPropertyOptional({
    example: 'JNE-REG-892182910',
    description: 'Nomor resi kurir pengiriman jika dikirim via kurir',
  })
  @IsString()
  @IsOptional()
  trackingNumber?: string;
}
