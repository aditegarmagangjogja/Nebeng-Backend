import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorators';

@ApiTags('Chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatsController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversation')
  @ApiOperation({
    summary: 'Mendapatkan atau membuat percakapan baru per trip',
  })
  @ApiResponse({
    status: 201,
    description: 'Percakapan berhasil ditemukan/dibuat',
  })
  async getOrCreateConversation(
    @GetUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.getOrCreateConversation(String(userId), dto);
  }

  @Get('conversation')
  @ApiOperation({ summary: 'Daftar semua percakapan milik pengguna' })
  @ApiResponse({ status: 200, description: 'Daftar percakapan ditemukan' })
  async getUserConversation(@GetUser('id') userId: string) {
    return this.chatService.getUserConversation(String(userId));
  }

  @Post('conversation/:id/messages')
  @ApiOperation({
    summary: 'Kirim pesan ke dalam percakapan (HTTP + Realtime Broadcast)',
  })
  @ApiResponse({ status: 201, description: 'Pesan berhasil terkirim' })
  async sendMessage(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(String(userId), conversationId, dto);
  }

  @Get('conversation/:id/messages')
  @ApiOperation({ summary: 'Mengambil riwayat pesan dalam percakapan' })
  @ApiResponse({ status: 200, description: 'Riwayat pesan ditemukan' })
  async getMessages(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.chatService.getMessages(String(userId), conversationId);
  }
}
