import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { ChatsController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatsController', () => {
  let controller: ChatsController;
  let chatService: jest.Mocked<ChatService>;

  beforeEach(async () => {
    const mockService = {
      getOrCreateConversation: jest.fn(),
      getUserConversation: jest.fn(),
      sendMessage: jest.fn(),
      getMessages: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatsController],
      providers: [{ provide: ChatService, useValue: mockService }],
    }).compile();

    controller = module.get<ChatsController>(ChatsController);
    chatService = module.get(ChatService) as jest.Mocked<ChatService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /chat/conversation (Endpoint Dapatkan / Buat Percakapan)', () => {
    it('harus memanggil chatService.getOrCreateConversation dengan userId dan DTO', async () => {
      const dto = { tripId: '100', customerId: '10' };
      const expectedResponse = { id: '1', tripId: '100' } as any;

      chatService.getOrCreateConversation.mockResolvedValue(expectedResponse);

      const result = await controller.getOrCreateConversation('10', dto);

      expect(chatService.getOrCreateConversation).toHaveBeenCalledWith(
        '10',
        dto,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /chat/conversation (Endpoint Daftar Percakapan Saya)', () => {
    it('harus memanggil chatService.getUserConversation dengan userId', async () => {
      chatService.getUserConversation.mockResolvedValue([]);

      const result = await controller.getUserConversation('10');

      expect(chatService.getUserConversation).toHaveBeenCalledWith('10');
      expect(result).toEqual([]);
    });
  });

  describe('POST /chat/conversation/:id/messages (Endpoint Kirim Pesan)', () => {
    it('harus memanggil chatService.sendMessage dengan userId, conversationId, dan DTO', async () => {
      const dto = { messageText: 'Halo Mitra' };
      const expectedResponse = { id: '50', messageText: 'Halo Mitra' } as any;

      chatService.sendMessage.mockResolvedValue(expectedResponse);

      const result = await controller.sendMessage('10', '1', dto);

      expect(chatService.sendMessage).toHaveBeenCalledWith('10', '1', dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /chat/conversation/:id/messages (Endpoint Riwayat Pesan)', () => {
    it('harus memanggil chatService.getMessages dengan userId dan conversationId', async () => {
      chatService.getMessages.mockResolvedValue([]);

      const result = await controller.getMessages('10', '1');

      expect(chatService.getMessages).toHaveBeenCalledWith('10', '1');
      expect(result).toEqual([]);
    });
  });
});
