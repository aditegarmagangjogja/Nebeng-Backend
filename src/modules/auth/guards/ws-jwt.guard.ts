import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();

      const token =
        client.handshake?.auth?.token ||
        client.handshake?.headers?.authorization?.split(' ')[1];

      if (!token) {
        throw new WsException('Token autentikasi WebSocket tidak ditemukan.');
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new WsException(
          'Konfigurasi server bermasalah (JWT_SECRET kosong).',
        );
      }

      const payload = await this.jwtService.verifyAsync(token, { secret });

      (client as any).user = payload;
      return true;
    } catch {
      throw new WsException(
        'Sesi WebSocket tidak valid atau telah kedaluwarsa.',
      );
    }
  }
}
