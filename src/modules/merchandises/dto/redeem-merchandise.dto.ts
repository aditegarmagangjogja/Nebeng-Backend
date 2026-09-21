import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RedeemMerchandiseDto {
  @ApiProperty({
    example: '1',
    description: 'ID Merchandise yang ingin ditukarkan',
  })
  @IsNotEmpty({ message: 'ID Merchandise wajib diisi' })
  @IsString()
  merchandiseId!: string;

  @ApiProperty({ example: 'Budi Santoso', description: 'Nama penerima barang' })
  @IsString()
  @IsNotEmpty({ message: 'Nama penerima wajib diisi' })
  recipientName!: string;

  @ApiProperty({
    example: '081234567890',
    description: 'Nomor telepon aktif penerima',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nomor telepon penerima wajib diisi' })
  recipientPhone!: string;

  @ApiPropertyOptional({
    example: 'Jl. Slamet Riyadi No. 12, Surakarta',
    description: 'Alamat pengiriman fisik',
  })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiPropertyOptional({
    example: '2',
    description: 'ID Pos Checkpoint jika memilih ambil mandiri di Pos',
  })
  @IsString()
  @IsOptional()
  pickupPosId?: string;
}
