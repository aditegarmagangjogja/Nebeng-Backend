import { PartialType } from '@nestjs/swagger';
import { CreateMerchandiseDto } from './create-merchandise.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMerchandiseDto extends PartialType(CreateMerchandiseDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
