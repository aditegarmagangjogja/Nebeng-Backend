import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CheckoutPaymentDto {
  @ApiProperty({ example: '1', description: 'ID order yang akan dibayar' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ example: 'BANK_TRANSFER / QRIS / MANUAL_SIMULATION' })
  @IsString()
  @IsNotEmpty()
  paymentGateway!: string;

  @ApiProperty({
    example: '123456',
    description: 'PIN transaksi 6-digit keamanan Customer',
  })
  @IsString()
  @IsNotEmpty({ message: 'PIN transaksi wajib diisi' })
  @Length(6, 6, { message: 'PIN transaksi harus terdiri dari 6 digit' })
  pin!: string;
}
