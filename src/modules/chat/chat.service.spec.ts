import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { ChatService } from './chat.service';
import { ChatRepository } from './repository/chat.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TripStatus } from '../../generated/prisma/enums';

describe('ChatService', () => {
  let service: ChatService;
  let chatRepository: jest.Mocked<ChatRepository>;
  let prismaService: jest.Mocked<PrismaService>;
  let chatGateway: jest.Mocked<ChatGateway>;

  const mockTrip = {
    id: BigInt(100),
    mitraId: BigInt(99), // Mitra ID: 99
    status: TripStatus.scheduled,
  };

  const mockUserCustomer = { id: BigInt(10), name: 'Customer Test' };
  const mockUserMitra = { id: BigInt(99), name: 'Mitra Test' };

  const mockConversation = {
    id: BigInt(1),
    tripId: BigInt(100),
    customerId: BigInt(10),
    mitraId: BigInt(99),
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    trip: mockTrip,
    customer: mockUserCustomer,
    mitra: mockUserMitra,
    messages: [],
  };

  const mockMessage = {
    id: BigInt(50),
    conversationId: BigInt(1),
    senderId: BigInt(10),
    messageText: 'Halo Mitra, saya sudah di pos',
    readAt: null,
    createdAt: new Date(),
    sender: mockUserCustomer,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockChatRepo = {
      findConversationByTripAndCustomer: jest.fn(),
      createConversation: jest.fn(),
      getUserConversations: jest.fn(),
      findConversationById: jest.fn(),
      createMessage: jest.fn(),
      getMessagesByConversation: jest.fn(),
      markMessagesAsRead: jest.fn(),
      countUnreadMessages: jest.fn(),
      lockConversation: jest.fn(),
    };

    const mockPrisma = {
      trip: {
        findUnique: jest.fn(),
      },
    };

    const mockGateway = {
      emitNewMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ChatRepository, useValue: mockChatRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChatGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    chatRepository = module.get(ChatRepository) as jest.Mocked<ChatRepository>;
    prismaService = module.get(
      PrismaService,
    ) as unknown as jest.Mocked<PrismaService>;
    chatGateway = module.get(ChatGateway) as jest.Mocked<ChatGateway>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateConversation (Dapatkan atau Buat Percakapan)', () => {
    it('harus mengembalikan percakapan yang ada jika percakapan sudah dibuat sebelumnya', async () => {
      const dto = { tripId: '100', customerId: '10' };

      (prismaService.trip.findUnique as jest.Mock<any>).mockResolvedValue(
        mockTrip as any,
      );
      chatRepository.findConversationByTripAndCustomer.mockResolvedValue(
        mockConversation as any,
      );
      chatRepository.countUnreadMessages.mockResolvedValue(0);

      const result = await service.getOrCreateConversation('10', dto);

      expect(prismaService.trip.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(100) },
      });
      expect(
        chatRepository.findConversationByTripAndCustomer,
      ).toHaveBeenCalledWith('100', '10');
      expect(result).toBeDefined();
      expect(result?.id).toEqual('1');
    });

    it('harus membuat percakapan baru jika belum pernah ada', async () => {
      const dto = { tripId: '100', customerId: '10' };

      (prismaService.trip.findUnique as jest.Mock<any>).mockResolvedValue(
        mockTrip as any,
      );
      chatRepository.findConversationByTripAndCustomer.mockResolvedValue(null);
      chatRepository.createConversation.mockResolvedValue(
        mockConversation as any,
      );
      chatRepository.countUnreadMessages.mockResolvedValue(0);

      const result = await service.getOrCreateConversation('10', dto);

      expect(chatRepository.createConversation).toHaveBeenCalledWith({
        tripIdStr: '100',
        customerIdStr: '10',
        mitraIdStr: '99',
      });
      expect(result?.id).toEqual('1');
    });

    it('harus melemparkan NotFoundException jika Trip tidak ditemukan', async () => {
      (prismaService.trip.findUnique as jest.Mock<any>).mockResolvedValue(null);

      await expect(
        service.getOrCreateConversation('10', {
          tripId: '999',
          customerId: '10',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus melemparkan ForbiddenException jika pengguna bukan customer maupun mitra pada trip tersebut', async () => {
      (prismaService.trip.findUnique as jest.Mock<any>).mockResolvedValue(
        mockTrip as any,
      );

      await expect(
        service.getOrCreateConversation('888', {
          tripId: '100',
          customerId: '10',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserConversation (Daftar Percakapan Pengguna)', () => {
    it('harus mengembalikan seluruh daftar percakapan milik pengguna beserta jumlah unread messages', async () => {
      chatRepository.getUserConversations.mockResolvedValue([
        mockConversation,
      ] as any);
      chatRepository.countUnreadMessages.mockResolvedValue(2);

      const result = await service.getUserConversation('10');

      expect(chatRepository.getUserConversations).toHaveBeenCalledWith('10');
      expect(chatRepository.countUnreadMessages).toHaveBeenCalledWith(
        '1',
        '10',
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.unreadCount).toEqual(2);
    });
  });

  describe('sendMessage (Kirim Pesan dalam Percakapan)', () => {
    it('harus berhasil menyimpan pesan ke database dan memancarkan event WebSocket secara real-time', async () => {
      const dto = { messageText: 'Halo Mitra, saya sudah di pos' };

      chatRepository.findConversationById.mockResolvedValue(
        mockConversation as any,
      );
      chatRepository.createMessage.mockResolvedValue(mockMessage as any);

      const result = await service.sendMessage('10', '1', dto);

      expect(chatRepository.createMessage).toHaveBeenCalledWith({
        conversationIdStr: '1',
        senderIdStr: '10',
        messageText: 'Halo Mitra, saya sudah di pos',
      });
      expect(chatGateway.emitNewMessage).toHaveBeenCalledWith(
        '1',
        expect.anything(),
      );
      expect(result?.messageText).toEqual('Halo Mitra, saya sudah di pos');
    });

    it('harus melemparkan NotFoundException jika Percakapan tidak ditemukan', async () => {
      chatRepository.findConversationById.mockResolvedValue(null);

      await expect(
        service.sendMessage('10', '999', { messageText: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus melemparkan ForbiddenException jika pengguna bukan anggota percakapan', async () => {
      chatRepository.findConversationById.mockResolvedValue(
        mockConversation as any,
      );

      await expect(
        service.sendMessage('888', '1', { messageText: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('harus mengunci percakapan dan melemparkan BadRequestException jika Trip sudah completed', async () => {
      chatRepository.findConversationById.mockResolvedValue({
        ...mockConversation,
        trip: { ...mockTrip, status: TripStatus.completed },
      } as any);

      await expect(
        service.sendMessage('10', '1', { messageText: 'Test' }),
      ).rejects.toThrow(BadRequestException);

      expect(chatRepository.lockConversation).toHaveBeenCalledWith('1');
    });

    it('harus mengunci percakapan dan melemparkan BadRequestException jika Trip sudah cancelled', async () => {
      chatRepository.findConversationById.mockResolvedValue({
        ...mockConversation,
        trip: { ...mockTrip, status: TripStatus.cancelled },
      } as any);

      await expect(
        service.sendMessage('10', '1', { messageText: 'Test' }),
      ).rejects.toThrow(BadRequestException);

      expect(chatRepository.lockConversation).toHaveBeenCalledWith('1');
    });
  });

  describe('getMessages (Riwayat Pesanan Percakapan)', () => {
    it('harus menandai pesan sebagai dibaca (read) dan mengembalikan riwayat pesan', async () => {
      chatRepository.findConversationById.mockResolvedValue(
        mockConversation as any,
      );
      chatRepository.getMessagesByConversation.mockResolvedValue([
        mockMessage,
      ] as any);

      const result = await service.getMessages('10', '1');

      expect(chatRepository.markMessagesAsRead).toHaveBeenCalledWith('1', '10');
      expect(chatRepository.getMessagesByConversation).toHaveBeenCalledWith(
        '1',
      );
      expect(result).toHaveLength(1);
    });

    it('harus melemparkan ForbiddenException jika bukan anggota percakapan saat mengambil riwayat pesan', async () => {
      chatRepository.findConversationById.mockResolvedValue(
        mockConversation as any,
      );

      await expect(service.getMessages('888', '1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
