import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private safeParseBigInt(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async findReviewByTripAndReviewer(tripId: string, reviewerId: string) {
    const parseTripId = this.safeParseBigInt(tripId);
    const parseReviewId = this.safeParseBigInt(reviewerId);

    if (!parseTripId || !parseReviewId) return null;

    return this.prisma.tripReview.findFirst({
      where: {
        tripId: parseTripId,
        reviewerId: parseReviewId,
      },
    });
  }

  async createReview(data: {
    tripId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment?: string;
  }) {
    const parseTripId = this.safeParseBigInt(data.tripId);
    const parseReviewerId = this.safeParseBigInt(data.reviewerId);
    const parseReviewId = this.safeParseBigInt(data.revieweeId);

    if (!parseTripId || !parseReviewerId || !parseReviewId) {
      throw new BadRequestException(
        'Format ID trip, Reviewer, atau review tidak valid',
      );
    }

    return this.prisma.tripReview.create({
      data: {
        tripId: parseTripId,
        reviewerId: parseReviewerId,
        revieweeId: parseReviewId,
        rating: data.rating,
        comment: data.comment,
      },
      include: {
        reviewer: true,
        reviewee: true,
        trip: true,
      },
    });
  }

  async getReviewsByReviewee(revieweeId: string) {
    const parsedRevieweId = this.safeParseBigInt(revieweeId);
    if (!parsedRevieweId) return [];

    return this.prisma.tripReview.findMany({
      where: { revieweeId: parsedRevieweId },
      include: {
        reviewer: true,
        trip: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAverageRatingAndCount(revieweeId: string) {
    const parsedRevieweeId = this.safeParseBigInt(revieweeId);
    if (!parsedRevieweeId) {
      return { averageRating: 0, totalReviews: 0 };
    }

    const aggregate = await this.prisma.tripReview.aggregate({
      where: { revieweeId: parsedRevieweeId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      averageRating: aggregate._avg.rating || 0,
      totalReviews: aggregate._count.rating || 0,
    };
  }

  async findTripById(tripId: string) {
    const parsedTripId = this.safeParseBigInt(tripId);
    if (!parsedTripId) return null;

    return this.prisma.trip.findUnique({
      where: { id: parsedTripId },
      include: {
        orders: true,
      },
    });
  }
}
