import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  const userId = 'user-1';
  const courseId = 'course-1';

  function buildService() {
    const prisma = {
      enrollment: { findUnique: jest.fn() },
      review: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
    };
    return { service: new ReviewsService(prisma as any), prisma };
  }

  describe('upsert', () => {
    it('throws ForbiddenException when the user is not enrolled', async () => {
      const { service, prisma } = buildService();
      prisma.enrollment.findUnique.mockResolvedValue(null);
      await expect(service.upsert(userId, courseId, { rating: 5, text: 'great' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('creates a review on first submission for an enrolled user', async () => {
      const { service, prisma } = buildService();
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enrollment-1', userId, courseId });
      prisma.review.upsert.mockResolvedValue({ id: 'review-1', rating: 5, text: 'great' });

      await service.upsert(userId, courseId, { rating: 5, text: 'great' });

      expect(prisma.review.upsert).toHaveBeenCalledWith({
        where: { userId_courseId: { userId, courseId } },
        create: { userId, courseId, rating: 5, text: 'great' },
        update: { rating: 5, text: 'great' },
      });
    });

    it('updates the same review on a second submission (upsert, not duplicate create)', async () => {
      const { service, prisma } = buildService();
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enrollment-1', userId, courseId });
      prisma.review.upsert.mockResolvedValue({ id: 'review-1', rating: 3, text: 'edited' });

      await service.upsert(userId, courseId, { rating: 3, text: 'edited' });

      expect(prisma.review.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.review.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { rating: 3, text: 'edited' } }),
      );
    });
  });

  describe('hide', () => {
    it('throws NotFoundException when the review does not exist', async () => {
      const { service, prisma } = buildService();
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(service.hide('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('sets hidden to true for an existing review', async () => {
      const { service, prisma } = buildService();
      prisma.review.findUnique.mockResolvedValue({ id: 'review-1' });
      prisma.review.update.mockResolvedValue({ id: 'review-1', hidden: true });
      await service.hide('review-1');
      expect(prisma.review.update).toHaveBeenCalledWith({ where: { id: 'review-1' }, data: { hidden: true } });
    });
  });
});
