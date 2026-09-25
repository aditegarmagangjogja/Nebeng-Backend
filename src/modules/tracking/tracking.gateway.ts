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
import { UseGuards, Logger } from '@nestjs/common';
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

  private readonly logger = new Logger(TrackingGateway.name);

  constructor(private readonly trackingService: TrackingService) {}

  /**
   * 1. Customer & Mitra bergabung ke Kamar Trip
   * Kamar ini mendengarkan posisi GPS langsung dan update Checkpoint pos
   */
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('joinTripRoom')
  handleJoinTripRoom(
    @MessageBody('tripId') tripId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!tripId) {
      return { status: 'error', message: 'Parameter tripId wajib diisi.' };
    }
    const roomName = `trip_${tripId}`;
    client.join(roomName);
    this.logger.log(`Client ${client.id} bergabung ke kamar: ${roomName}`);
    return { event: 'joinedRoom', room: roomName };
  }

  /**
   * 2. Admin Regional bergabung ke Kamar Wilayah
   * Kamar ini mendengarkan seluruh pergerakan armada di wilayah tersebut
   */
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('joinRegionRoom')
  handleJoinRegionRoom(
    @MessageBody('regionId') regionId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!regionId) {
      return { status: 'error', message: 'Parameter regionId wajib diisi.' };
    }
    const roomName = `region_${regionId}`;
    client.join(roomName);
    this.logger.log(
      `Admin ${client.id} bergabung ke kamar wilayah: ${roomName}`,
    );
    return { event: 'joinedRegionRoom', room: roomName };
  }

  /**
   * 3. Mitra mengirim koordinat GPS terbaru secara live
   */
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

      // Siarkan ke seluruh penumpang di trip tersebut
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

  /**
   * 4. Helper Method: Memancarkan event pemindaian Checkpoint (Dipanggil dari CheckpointsService)
   */
  emitCheckpointScanned(tripId: string, regionId: string, payload: any) {
    if (!this.server) return;

    // A. Kirim ke penumpang & mitra di trip terkait (update status & kode QR baru)
    const tripRoom = `trip_${tripId}`;
    this.server.to(tripRoom).emit('checkpointScanned', payload);

    // B. Kirim ke dashboard Admin Regional jika regionId tersedia
    if (regionId) {
      const regionRoom = `region_${regionId}`;
      this.server.to(regionRoom).emit('regionalFleetUpdated', {
        tripId,
        checkpointData: payload,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.log(
      `Broadcast checkpoint untuk Trip #${tripId} berhasil dipancarkan.`,
    );
  }
}
