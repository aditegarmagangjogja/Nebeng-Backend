import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ScanType } from '../../../generated/prisma/enums';

export class ScanCheckpointDto {
  @ApiProperty({
    example: 'TRIP-A2D4CS13',
    description: 'Kode QR Trip milik mitra',
  })
  @IsString()
  @IsNotEmpty()
  qrCodeTrip!: string;

  @ApiProperty({
    example: 'TKT-SDJF12H',
    description: 'Kode QR Tiket / Parcel milik customer',
  })
  @IsString()
  @IsNotEmpty()
  qrCodeTicket!: string;

  @ApiProperty({
    example: '10',
    description: 'ID pos resmi tempat operator bertugas',
  })
  @IsString()
  @IsOptional()
  posId?: string;

  @ApiProperty({ enum: ScanType, example: ScanType.checkin_origin })
  @IsEnum(ScanType)
  scanType!: ScanType;

  @ApiPropertyOptional({
    example: '8765432',
    description: 'Kode OTP 6-digit milik penerima',
  })
  @IsOptional()
  @IsString()
  otpClaim?: string;

  @ApiPropertyOptional({
    example: 'SEAL-2981312',
    description: 'Nomor stiker segel QR',
  })
  @IsOptional()
  @IsString()
  securitySealQr?: string;
}
