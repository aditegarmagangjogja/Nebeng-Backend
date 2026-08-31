import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CheckoutPaymentDto {
  @ApiProperty({ example: '1', description: 'ID order yang akan dibayar' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ example: 'BANK_TRANSFER / QRIS / MANUAL_SIMULATION' })
  @IsString()
  @IsNotEmpty()
  paymentGateway!: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'PIN transaksi 6-digit keamanan Customer',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'PIN transaksi harus terdiri dari 6 digit' })
  pin?: string;
}
