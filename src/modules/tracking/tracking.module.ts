import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';
import { TrackingRepository } from './tracking.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { WsJwtAuthGuard } from '../auth/guards/ws-jwt.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('JWT_SECRET') || 'super-secret-key';
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '1d';

        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
    }),
  ],
  providers: [
    TrackingGateway,
    TrackingService,
    TrackingRepository,
    WsJwtAuthGuard,
  ],
  exports: [TrackingService],
})
export class TrackingModule {}
