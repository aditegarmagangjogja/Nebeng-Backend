import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min, IsOptional, IsString } from 'class-validator';
import { TripStatus, VehicleType } from '../../../generated/prisma/enums';

export class QueryTripDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  originPointId?: string;

  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @IsString()
  destinationPointId?: string;

  @ApiPropertyOptional({
    example: '10',
    description: 'Filter trip masuk/keluar pos ini',
  })
  @IsOptional()
  @IsString()
  posId?: string;

  @ApiPropertyOptional({ example: '2026-08-25' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ enum: TripStatus })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;
}
