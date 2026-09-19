import { Module } from '@nestjs/common';
import { MerchandiseController } from './merchandise.controller';
import { MerchandiseService } from './merchandise.service';
import { MerchandiseRepository } from './repository/merchandise.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MerchandiseController],
  providers: [MerchandiseService, MerchandiseRepository],
  exports: [MerchandiseService],
})
export class MerchandiseModule {}
