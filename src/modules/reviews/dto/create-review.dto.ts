import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'ID trip yang diulas',
    example: '10',
  })
  @IsNotEmpty({ message: 'tripId tidak boleh kosong' })
  @IsString({ message: 'tripId harus berupa string' })
  tripId!: string;

  @ApiProperty({
    description: 'ID user yang dinilai',
    example: '2',
  })
  @IsNotEmpty({ message: 'revieweeId tidak boleh kosong' })
  @IsString({ message: 'revieweeId harus berupa string' })
  revieweeId!: string;

  @ApiProperty({
    description: 'bintang rating 1 sampai 5',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty({ message: 'rating tidak boleh kosong' })
  @IsInt({ message: 'rating harus berupa angka bulat' })
  @Min(1, { message: 'rating minimal 1' })
  @Max(5, { message: 'rating maksimal 5' })
  rating!: number;

  @ApiProperty({
    description: 'Komentar atau ulasan tertulis',
    example: 'Perjalanan sangat nyaman driver sangat ramah',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'comment harus berupa string' })
  comment?: string;
}
