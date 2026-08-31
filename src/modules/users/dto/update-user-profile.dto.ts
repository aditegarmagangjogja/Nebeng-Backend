import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({
    example: '3374123456789001',
    description: 'Nomor KTP 16 digit',
  })
  @IsOptional()
  @IsString()
  @Length(16, 16, { message: 'Nomor KTP harus 16 digit' })
  ktpNumber?: string;

  @ApiPropertyOptional({
    example: 'Budi Santoso',
    description: 'Nama lengkap sesuai KTP',
  })
  @IsOptional()
  @IsString()
  fullNameKtp?: string;

  @ApiPropertyOptional({
    example: 'Jl. Merdeka No. 12, Jakarta',
    description: 'Alamat lengkap KTP',
  })
  @IsOptional()
  @IsString()
  addressKtp?: string;

  @ApiPropertyOptional({
    example: 'https://storage.nebeng.com/faces/user-123.jpg',
    description: 'URL foto wajah / Face ID scan',
  })
  @IsOptional()
  @IsString()
  faceImageUrl?: string;

  @ApiPropertyOptional({
    example: 'BCA',
    description: 'Nama Bank pencairan saldo',
  })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({
    example: '1234567890',
    description: 'Nomor Rekening Bank',
  })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({
    example: 'Budi Santoso',
    description: 'Nama Pemilik Rekening Bank',
  })
  @IsOptional()
  @IsString()
  bankAccountHolder?: string;
}
