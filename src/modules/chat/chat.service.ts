import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ChatRepository } from './repository/chat.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatMapper } from './mappers/chat.mapper';
import { ChatGateway } from './chat.gateway';
import { TripStatus } from '../../generated/prisma/enums';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async getOrCreateConversation(
    currentUserId: string,
    dto: CreateConversationDto,
  ) {
    const parsedTripId = this.safeParseBigInt(dto.tripId);
    if (!parsedTripId) {
      throw new BadRequestException('Format ID Trip tidak valid.');
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: parsedTripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip tidak ditemukan');
    }

    const isMitra = trip.mitraId.toString() === currentUserId;
    const targetCustomerId = isMitra ? dto.customerId : currentUserId;

    if (!targetCustomerId) {
      throw new BadRequestException(
        'Mitra wajib menyertakan ID Customer untuk membuka obrolan.',
      );
    }

    if (!isMitra && dto.customerId && dto.customerId !== currentUserId) {
      throw new ForbiddenException(
        'Anda tidak diperbolehkan membuat percakapan atas nama pengguna lain.',
      );
    }

    let conversation =
      await this.chatRepository.findConversationByTripAndCustomer(
        dto.tripId,
        targetCustomerId,
      );

    if (!conversation) {
      conversation = await this.chatRepository.createConversation({
        tripIdStr: dto.tripId,
        customerIdStr: targetCustomerId,
        mitraIdStr: trip.mitraId.toString(),
      });
    }

    if (!conversation) {
      throw new NotFoundException('Gagal membuat atau menemukan percakapan');
    }

    const unreadCount = await this.chatRepository.countUnreadMessages(
      conversation.id.toString(),
      currentUserId,
    );

    return ChatMapper.toConversationResponse({
      ...conversation,
      unreadCount,
    });
  }

  async getUserConversation(currentUserId: string) {
    const conversations =
      await this.chatRepository.getUserConversations(currentUserId);

    const mappedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.chatRepository.countUnreadMessages(
          conv.id.toString(),
          currentUserId,
        );
        return ChatMapper.toConversationResponse({
          ...conv,
          unreadCount,
        });
      }),
    );

    return mappedConversations;
  }

  async sendMessage(
    currentUserId: string,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    const conversation =
      await this.chatRepository.findConversationById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Percakapan tidak ditemukan');
    }

    if (
      conversation.customerId.toString() !== currentUserId &&
      conversation.mitraId.toString() !== currentUserId
    ) {
      throw new ForbiddenException(
        'Akses ditolak. Anda bukan anggota percakapan ini.',
      );
    }

    if (
      conversation.isLocked ||
      conversation.trip.status === TripStatus.completed ||
      conversation.trip.status === TripStatus.cancelled
    ) {
      if (!conversation.isLocked) {
        await this.chatRepository.lockConversation(conversationId);
      }
      throw new BadRequestException(
        'Percakapan telah dikunci karena trip telah selesai atau dibatalkan',
      );
    }

    const message = await this.chatRepository.createMessage({
      conversationIdStr: conversationId,
      senderIdStr: currentUserId,
      messageText: dto.messageText,
    });

    const responsePayload = ChatMapper.toMessageResponse(message);

    this.chatGateway.emitNewMessage(conversationId, responsePayload);

    return responsePayload;
  }

  async getMessages(currentUserId: string, conversationId: string) {
    const conversation =
      await this.chatRepository.findConversationById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Percakapan tidak ditemukan.');
    }

    if (
      conversation.customerId.toString() !== currentUserId &&
      conversation.mitraId.toString() !== currentUserId
    ) {
      throw new ForbiddenException(
        'Akses ditolak. Anda bukan anggota percakapan ini',
      );
    }

    await this.chatRepository.markMessagesAsRead(conversationId, currentUserId);
    const messages =
      await this.chatRepository.getMessagesByConversation(conversationId);
    return messages.map((msg) => ChatMapper.toMessageResponse(msg));
  }
}
