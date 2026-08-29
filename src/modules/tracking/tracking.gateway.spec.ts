import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';
import { Server, Socket } from 'socket.io';

describe('TrackingGateway', () => {
  let gateway: TrackingGateway;
  let trackingService: jest.Mocked<TrackingService>;
  let mockServer: { to: jest.Mock };
  let mockSocket: { join: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      saveLocation: jest.fn(),
      getTripHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingGateway,
        { provide: TrackingService, useValue: mockService },
      ],
    }).compile();

    gateway = module.get<TrackingGateway>(TrackingGateway);
    trackingService = module.get(
      TrackingService,
    ) as jest.Mocked<TrackingService>;

    // Mock Socket.io Server & Client Instance
    mockServer = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    };
    mockSocket = {
      join: jest.fn(),
    };

    gateway.server = mockServer as unknown as Server;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleJoinRoom (WebSocket Event: joinTripRoom)', () => {
    it('harus memasukkan socket client ke room trip spesifik dan mereturn status joined', () => {
      const tripId = '100';

      const result = gateway.handleJoinRoom(
        tripId,
        mockSocket as unknown as Socket,
      );

      expect(mockSocket.join).toHaveBeenCalledWith('trip_100');
      expect(result).toEqual({ event: 'joinedRoom', room: 'trip_100' });
    });
  });

  describe('handleUpdateLocation (WebSocket Event: updateLocation)', () => {
    it('harus menyimpan lokasi via service dan menyiarkan (emit) update lokasi ke room socket terkait', async () => {
      const dto = {
        tripId: '100',
        latitude: -7.7956,
        longtitude: 110.3695,
      };

      const mockEmit = jest.fn();
      mockServer.to.mockReturnValue({ emit: mockEmit });
      trackingService.saveLocation.mockResolvedValue({} as any);

      const result = await gateway.handleUpdateLocation(dto);

      expect(trackingService.saveLocation).toHaveBeenCalledWith(dto);
      expect(mockServer.to).toHaveBeenCalledWith('trip_100');
      expect(mockEmit).toHaveBeenCalledWith(
        'locationUpdated',
        expect.objectContaining({
          tripId: '100',
          latitude: -7.7956,
          longtitude: 110.3695,
        }),
      );
      expect(result).toEqual({ status: 'success' });
    });
  });
});
