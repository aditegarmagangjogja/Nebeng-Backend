import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ReviewsRepository } from './repository/reviews.repository';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewMapper } from './mappers/review.mapper';
import { TripStatus } from '../../generated/prisma/enums';

@Injectable()
export class ReviewsService {
  constructor(private readonly reviewsRepository: ReviewsRepository) {}

  async createReview(currentUserId: string, dto: CreateReviewDto) {
    if (currentUserId === dto.revieweeId) {
      throw new BadRequestException('Anda tidak dapat mengulas diri sendiri.');
    }

    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException(
        'Rating harus berada di antara angka 1 sampai 5.',
      );
    }

    const trip = await this.reviewsRepository.findTripById(dto.tripId);
    if (!trip) {
      throw new NotFoundException('Trip tidak ditemukan.');
    }

    if (trip.status !== TripStatus.completed) {
      throw new BadRequestException(
        'Ulasan hanya dapat diberikan setelah trip berstatus selesai (completed).',
      );
    }

    const isMitra = trip.mitraId.toString() === currentUserId;
    const customerOrder = trip.orders.find(
      (order) => order.customerId.toString() === currentUserId,
    );
    const isCustomer = !!customerOrder;

    if (!isMitra && !isCustomer) {
      throw new ForbiddenException(
        'Akses ditolak. Anda bukan partisipan dalam trip ini.',
      );
    }

    if (isCustomer) {
      if (dto.revieweeId !== trip.mitraId.toString()) {
        throw new BadRequestException(
          'Customer hanya dapat memberikan ulasan kepada Mitra pengemudi trip.',
        );
      }
    } else if (isMitra) {
      const isTargetValidCustomer = trip.orders.some(
        (order) => order.customerId.toString() === dto.revieweeId,
      );
      if (!isTargetValidCustomer) {
        throw new BadRequestException(
          'Mitra hanya dapat memberikan ulasan kepada Customer yang memesan pada trip ini.',
        );
      }
    }

    const existingReview =
      await this.reviewsRepository.findReviewByTripAndReviewer(
        dto.tripId,
        currentUserId,
      );

    if (existingReview) {
      throw new BadRequestException(
        'Anda sudah memberikan ulasan untuk trip ini.',
      );
    }

    const review = await this.reviewsRepository.createReview({
      tripId: dto.tripId,
      reviewerId: currentUserId,
      revieweeId: dto.revieweeId,
      rating: dto.rating,
      comment: dto.comment,
    });

    return ReviewMapper.toReviewResponse(review);
  }

  async getUserRatingSummary(userId: string) {
    const reviews = await this.reviewsRepository.getReviewsByReviewee(userId);
    const aggregate =
      await this.reviewsRepository.getAverageRatingAndCount(userId);

    return ReviewMapper.toRatingSummaryResponse({
      averageRating: aggregate.averageRating,
      totalReviews: aggregate.totalReviews,
      reviews,
    });
  }
}
