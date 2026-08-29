import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { GetUser } from '../../common/decorators/get-user.decorators';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewService: ReviewsService) {}

  @Post()
  @ApiOperation({
    summary: 'Memberikan ulasan/rating untuk trip yang sudah selesai',
  })
  @ApiResponse({ status: 201, description: 'Ulasan berhasil dibut' })
  @ApiResponse({
    status: 400,
    description:
      'Mengulas diri sendiri, trip belum selesai, atau sudah memberi ulasan',
  })
  @ApiResponse({
    status: 403,
    description: 'Anda bukan partisipan dalam trip ini',
  })
  async createReview(
    @GetUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.createReview(String(userId), dto);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Melihat ringkasan dan daftar ulasan user' })
  @ApiResponse({ status: 200, description: 'Ringkasan ulasan ditemukan' })
  async getUserRatingSummary(@Param('userId') userId: string) {
    return this.reviewService.getUserRatingSummary(userId);
  }
}
