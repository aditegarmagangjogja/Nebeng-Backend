export class ReviewMapper {
  static toReviewResponse(review: any) {
    if (!review) return null;

    return {
      id: review.id.toString(),
      tripId: review.tripId.toString(),
      reviewerId: review.reviewerId.toString(),
      revieweeId: review.revieweeId.toString(),
      rating: review.rating,
      comment: review.comment || null,
      createdAt: review.createdAt ? review.createdAt.toISOString() : null,
      reviewer: review.reviewer
        ? {
            id: review.reviewer.id.toString(),
            name: review.reviewer.name,
            avatar: review.reviewer.avatar || null,
            role: review.reviewer.role,
          }
        : undefined,
      reviewee: review.reviewee
        ? {
            id: review.reviewee.id.toString(),
            name: review.reviewee.name,
            avatar: review.reviewee.avatar || null,
            role: review.reviewee.role,
          }
        : undefined,
      trip: review.trip
        ? {
            id: review.trip.id.toString(),
            status: review.trip.status,
            departureDate: review.trip.departureDate,
          }
        : undefined,
    };
  }

  static toRatingSummaryResponse(data: {
    averageRating: number;
    totalReviews: number;
    reviews?: any[];
  }) {
    return {
      averageRating: Number(data.averageRating.toFixed(1)),
      totalReviews: data.totalReviews,
      reviews: data.reviews
        ? data.reviews.map((rev) => this.toReviewResponse(rev))
        : [],
    };
  }
}
