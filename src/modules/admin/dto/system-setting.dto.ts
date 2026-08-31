import { IsNumber, IsPositive, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlatformCommissionDto {
  @ApiProperty({ example: 10, description: 'presentase komisi platfrom' })
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage!: number;
}

export class UpdateRegionRateDto {
  @ApiProperty({
    example: 3000,
    description: 'Tarip dasar pengiriman/perjalanan per kilometer (Rp/Km)',
  })
  @IsNumber()
  @IsPositive()
  pricePerKm!: number;
}
