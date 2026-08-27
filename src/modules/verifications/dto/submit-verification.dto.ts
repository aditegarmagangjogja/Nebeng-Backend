import { ApiProperty } from '@nestjs/swagger';
import { VerificationType } from '../../../generated/prisma/enums';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class VerifiactionFileDto {
  @ApiProperty({ example: '/uploads/verifications/ktp-123.jpg' })
  @IsString()
  @IsNotEmpty()
  filePath!: string;

  @ApiProperty({
    example: 'image/jpeg',
    description: 'Format MIME type file hanya .jpg, .png, .pdf',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(
    ['image/jpg', 'image/png', 'application/pdf', 'image/jpg', 'image/jpeg'],
    {
      message: 'Tipe file tidak valid. hanya diperbolehkan jpep, jpg, png, pdf',
    },
  )
  fileType!: string;
}

export class SumbitVerificationDto {
  @ApiProperty({ enum: VerificationType, example: VerificationType.ktp })
  @IsEnum(VerificationType)
  @IsNotEmpty()
  type!: VerificationType;

  @ApiProperty({ type: [VerifiactionFileDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VerifiactionFileDto)
  files!: VerifiactionFileDto[];
}
