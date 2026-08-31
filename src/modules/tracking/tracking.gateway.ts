import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TrackingService } from './tracking.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UseGuards } from '@nestjs/common';
import { WsJwtAuthGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'tracking',
})
export class TrackingGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly trackingService: TrackingService) {}

  @SubscribeMessage('joinTripRoom')
  handleJoinRoom(
    @MessageBody('tripId') tripId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!tripId) {
      return { status: 'error', message: 'Parameter tripId wajib diisi.' };
    }
    const roomName = `trip_${tripId}`;
    client.join(roomName);
    return { event: 'joinedRoom', room: roomName };
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(
    @ConnectedSocket() client: any,
    @MessageBody() dto: UpdateLocationDto,
  ) {
    try {
      const mitraUserId = client.user?.id || client.user?.sub;

      await this.trackingService.validateAndSaveLocation(
        String(mitraUserId),
        dto,
      );

      const roomName = `trip_${dto.tripId}`;
      const longitude = dto.longtitude ?? (dto as any).longtitude;

      this.server.to(roomName).emit('locationUpdated', {
        tripId: dto.tripId,
        latitude: dto.latitude,
        longitude: longitude,
        timestamp: new Date().toISOString(),
      });

      return { status: 'success' };
    } catch (error: any) {
      return { status: 'error', message: error.message };
    }
  }
}
