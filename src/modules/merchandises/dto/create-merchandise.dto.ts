import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMerchandiseDto {
  @ApiProperty({
    example: 'Tumbler Eksklusif Nebeng',
    description: 'Nama merchandise',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nama merchandise wajib diisi' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Tumbler stainless tahan panas/dingin 500ml',
    description: 'Deskripsi merchandise',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 250, description: 'Jumlah poin yang dibutuhkan' })
  @Type(() => Number)
  @IsInt({ message: 'Poin harus berupa bilangan bulat' })
  @IsPositive({ message: 'Poin harus lebih besar dari 0' })
  pointsRequired!: number;

  @ApiProperty({ example: 50, description: 'Stok awal barang' })
  @Type(() => Number)
  @IsInt({ message: 'Stok harus berupa bilangan bulat' })
  @Min(0, { message: 'Stok tidak boleh minus' })
  stock!: number;

  @ApiPropertyOptional({
    example: 'https://cdn.nebeng.id/images/tumbler.png',
    description: 'URL foto merchandise',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
