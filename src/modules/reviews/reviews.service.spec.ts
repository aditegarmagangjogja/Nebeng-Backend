import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { ReviewsService } from './reviews.service';
import { ReviewsRepository } from './repository/reviews.repository';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TripStatus } from '../../generated/prisma/enums';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let repository: jest.Mocked<ReviewsRepository>;

  const mockTrip = {
    id: BigInt(100),
    mitraId: BigInt(10), // Mitra ID
    status: TripStatus.completed,
    orders: [
      {
        id: BigInt(1),
        customerId: BigInt(20), // Customer ID
      },
    ],
  };

  const mockReview = {
    id: BigInt(1),
    tripId: BigInt(100),
    reviewerId: BigInt(20),
    revieweeId: BigInt(10),
    rating: 5,
    comment: 'Pelayanan sangat memuaskan!',
    createdAt: new Date(),
    reviewer: { id: BigInt(20), name: 'Customer Test' },
    reviewee: { id: BigInt(10), name: 'Mitra Test' },
    trip: mockTrip,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      findReviewByTripAndReviewer: jest.fn(),
      createReview: jest.fn(),
      getReviewsByReviewee: jest.fn(),
      getAverageRatingAndCount: jest.fn(),
      findTripById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: ReviewsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    repository = module.get(
      ReviewsRepository,
    ) as jest.Mocked<ReviewsRepository>;
  });

  it('harus terinisialisasi dengan benar', () => {
    expect(service).toBeDefined();
  });

  describe('createReview (Pemberian Ulasan Baru)', () => {
    it('harus berhasil membuat ulasan dari Customer ke Mitra saat trip completed', async () => {
      const dto = {
        tripId: '100',
        revieweeId: '10', // Mengulas Mitra
        rating: 5,
        comment: 'Sangat bagus',
      };

      repository.findTripById.mockResolvedValue(mockTrip as any);
      repository.findReviewByTripAndReviewer.mockResolvedValue(null);
      repository.createReview.mockResolvedValue(mockReview as any);

      const result = await service.createReview('20', dto); // Customer (20)

      expect(repository.findTripById).toHaveBeenCalledWith('100');
      expect(repository.findReviewByTripAndReviewer).toHaveBeenCalledWith(
        '100',
        '20',
      );
      expect(repository.createReview).toHaveBeenCalledWith({
        tripId: '100',
        reviewerId: '20',
        revieweeId: '10',
        rating: 5,
        comment: 'Sangat bagus',
      });
      expect(result).toBeDefined();
    });

    it('harus melemparkan BadRequestException jika pengguna mencoba mengulas diri sendiri', async () => {
      const dto = {
        tripId: '100',
        revieweeId: '20', // Mengulas ID yang sama dengan currentUserId (20)
        rating: 5,
      };

      await expect(service.createReview('20', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('harus melemparkan NotFoundException jika Trip tidak ditemukan', async () => {
      repository.findTripById.mockResolvedValue(null);

      await expect(
        service.createReview('20', {
          tripId: '999',
          revieweeId: '10',
          rating: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus melemparkan BadRequestException jika status Trip belum completed', async () => {
      const dto = { tripId: '100', revieweeId: '10', rating: 5 };

      repository.findTripById.mockResolvedValue({
        ...mockTrip,
        status: TripStatus.in_transit, // Belum completed
      } as any);

      await expect(service.createReview('20', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('harus melemparkan ForbiddenException jika pengguna bukan partisipan (bukan Mitra/Customer di Trip tersebut)', async () => {
      const dto = { tripId: '100', revieweeId: '10', rating: 5 };

      repository.findTripById.mockResolvedValue(mockTrip as any);

      await expect(
        service.createReview('999', dto), // User 999 bukan partisipan
      ).rejects.toThrow(ForbiddenException);
    });

    it('harus melemparkan BadRequestException jika pengguna sudah pernah memberikan ulasan pada Trip ini', async () => {
      const dto = { tripId: '100', revieweeId: '10', rating: 5 };

      repository.findTripById.mockResolvedValue(mockTrip as any);
      repository.findReviewByTripAndReviewer.mockResolvedValue(
        mockReview as any,
      ); // Ulasan sudah ada

      await expect(service.createReview('20', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUserRatingSummary (Ringkasan Rating dan Daftar Ulasan User)', () => {
    it('harus mengembalikan rata-rata rating, total ulasan, dan daftar ulasan', async () => {
      repository.getReviewsByReviewee.mockResolvedValue([mockReview] as any);
      repository.getAverageRatingAndCount.mockResolvedValue({
        averageRating: 5,
        totalReviews: 1,
      });

      const result = await service.getUserRatingSummary('10');

      expect(repository.getReviewsByReviewee).toHaveBeenCalledWith('10');
      expect(repository.getAverageRatingAndCount).toHaveBeenCalledWith('10');
      expect(result).toBeDefined();
    });
  });
});
