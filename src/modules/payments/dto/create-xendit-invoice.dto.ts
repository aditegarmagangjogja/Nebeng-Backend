import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateXenditInvoiceDto {
  @ApiProperty({ example: '1', description: 'ID Order yang akan dibayar' })
  @IsString()
  @IsNotEmpty({ message: 'ID Order wajib diisi' })
  orderId!: string;
}
