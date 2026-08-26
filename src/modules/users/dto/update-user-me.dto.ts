import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserMeDto extends PartialType(
  OmitType(CreateUserDto, ['role', 'status'] as const),
) {}
