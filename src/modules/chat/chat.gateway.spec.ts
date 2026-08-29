import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { ChatGateway } from './chat.gateway';
import { Server, Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let mockServer: { to: jest.Mock };
  let mockSocket: { id: string; join: jest.Mock; leave: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatGateway],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);

    mockServer = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    };
    mockSocket = {
      id: 'socket_123',
      join: jest.fn(),
      leave: jest.fn(),
    };

    gateway.server = mockServer as unknown as Server;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleJoinRoom (WebSocket Event: join_conversation)', () => {
    it('harus memasukkan socket client ke room percakapan spesifik', () => {
      const data = { conversationId: '1' };

      const result = gateway.handleJoinRoom(
        mockSocket as unknown as Socket,
        data,
      );

      expect(mockSocket.join).toHaveBeenCalledWith('conversation_1');
      expect(result).toEqual({ event: 'joined_room', room: 'conversation_1' });
    });
  });

  describe('handleLeaveRoom (WebSocket Event: leave_conversation)', () => {
    it('harus mengeluarkan socket client dari room percakapan', () => {
      const data = { conversationId: '1' };

      gateway.handleLeaveRoom(mockSocket as unknown as Socket, data);

      expect(mockSocket.leave).toHaveBeenCalledWith('conversation_1');
    });
  });

  describe('emitNewMessage (WebSocket Method Penyiaran Real-Time)', () => {
    it('harus menyiarkan pesan ke room percakapan yang sesuai dengan event new_message', () => {
      const mockEmit = jest.fn();
      mockServer.to.mockReturnValue({ emit: mockEmit });

      const payload = { id: '50', messageText: 'Halo Realtime' };
      gateway.emitNewMessage('1', payload);

      expect(mockServer.to).toHaveBeenCalledWith('conversation_1');
      expect(mockEmit).toHaveBeenCalledWith('new_message', payload);
    });
  });
});
