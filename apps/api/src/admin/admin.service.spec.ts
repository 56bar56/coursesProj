import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  const courseId = 'course-1';

  function buildService() {
    const prisma = {
      course: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    const reviewsService = { hide: jest.fn() };
    return { service: new AdminService(prisma as any, reviewsService as any), prisma, reviewsService };
  }

  describe('approve', () => {
    it('throws NotFoundException when the course does not exist', async () => {
      const { service, prisma } = buildService();
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(service.approve(courseId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when the course is not PENDING_REVIEW', async () => {
      const { service, prisma } = buildService();
      prisma.course.findUnique.mockResolvedValue({ id: courseId, status: 'DRAFT' });
      await expect(service.approve(courseId)).rejects.toBeInstanceOf(ConflictException);
    });

    it('transitions a PENDING_REVIEW course to PUBLISHED and clears rejectionReason', async () => {
      const { service, prisma } = buildService();
      prisma.course.findUnique.mockResolvedValue({ id: courseId, status: 'PENDING_REVIEW' });
      prisma.course.update.mockResolvedValue({ id: courseId, status: 'PUBLISHED' });
      await service.approve(courseId);
      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: { status: 'PUBLISHED', rejectionReason: null },
      });
    });
  });

  describe('reject', () => {
    it('throws ConflictException when the course is not PENDING_REVIEW', async () => {
      const { service, prisma } = buildService();
      prisma.course.findUnique.mockResolvedValue({ id: courseId, status: 'PUBLISHED' });
      await expect(service.reject(courseId, 'not good enough')).rejects.toBeInstanceOf(ConflictException);
    });

    it('transitions a PENDING_REVIEW course to REJECTED with a reason', async () => {
      const { service, prisma } = buildService();
      prisma.course.findUnique.mockResolvedValue({ id: courseId, status: 'PENDING_REVIEW' });
      prisma.course.update.mockResolvedValue({ id: courseId, status: 'REJECTED' });
      await service.reject(courseId, 'not good enough');
      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: { status: 'REJECTED', rejectionReason: 'not good enough' },
      });
    });
  });

  describe('hideReview', () => {
    it('delegates to ReviewsService.hide', async () => {
      const { service, reviewsService } = buildService();
      reviewsService.hide.mockResolvedValue({ id: 'review-1', hidden: true });
      await service.hideReview('review-1');
      expect(reviewsService.hide).toHaveBeenCalledWith('review-1');
    });
  });
});
