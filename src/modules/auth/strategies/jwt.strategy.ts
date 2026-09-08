import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../users/repositories/user.repository';
import { UserStatus } from '../../../generated/prisma/enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'FATAL ERROR: JWT_SECRET belum didefinisikan di environment variables.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(
        'Sesi tidak valid. Pengguna tidak ditemukan',
      );
    }

    if (user.status === UserStatus.suspended) {
      throw new ForbiddenException('Akun anda sedang ditangguhkan (Suspended)');
    }

    if (user.status === UserStatus.blocked) {
      throw new ForbiddenException('Akun anda telah diblokir (Blocked)');
    }

    if (user.status !== UserStatus.active) {
      throw new UnauthorizedException('Akun anda tidak aktif');
    }

    return {
      id: user.id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      statusVerification: user.statusVerification,
      regionId: user.regionId ? user.regionId.toString() : null,
    };
  }
}
