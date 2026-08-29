import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let reviewsService: jest.Mocked<ReviewsService>;

  beforeEach(async () => {
    const mockService = {
      createReview: jest.fn(),
      getUserRatingSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: mockService }],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
    reviewsService = module.get(ReviewsService) as jest.Mocked<ReviewsService>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /reviews (Endpoint Memberikan Ulasan)', () => {
    it('harus memanggil reviewsService.createReview dengan ID reviewer dan DTO', async () => {
      const dto = {
        tripId: '100',
        revieweeId: '10',
        rating: 5,
        comment: 'Bagus',
      };
      const expectedResponse = { id: '1', ...dto } as any;

      reviewsService.createReview.mockResolvedValue(expectedResponse);

      const result = await controller.createReview('20', dto);

      expect(reviewsService.createReview).toHaveBeenCalledWith('20', dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /reviews/users/:userId (Endpoint Ringkasan Ulasan User)', () => {
    it('harus memanggil reviewsService.getUserRatingSummary dengan ID reviewee', async () => {
      const expectedResponse = {
        averageRating: 4.8,
        totalReviews: 10,
        reviews: [],
      } as any;

      reviewsService.getUserRatingSummary.mockResolvedValue(expectedResponse);

      const result = await controller.getUserRatingSummary('10');

      expect(reviewsService.getUserRatingSummary).toHaveBeenCalledWith('10');
      expect(result).toEqual(expectedResponse);
    });
  });
});
