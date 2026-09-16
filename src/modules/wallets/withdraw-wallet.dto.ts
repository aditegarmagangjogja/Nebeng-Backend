import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class WithdrawWalletDto {
  @ApiProperty({
    example: 50000,
    description: 'Jumlah saldo yang ingin ditarik',
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(10000, { message: 'Minimal penarikan saldo adalah Rp 10.000' })
  amount!: number;
}
