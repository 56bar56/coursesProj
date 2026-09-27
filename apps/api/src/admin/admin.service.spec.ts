import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  const courseId = 'course-1';

  function buildService() {
    const prisma = {
      course: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
      user: { findMany: jest.fn(), count: jest.fn() },
      enrollment: { count: jest.fn() },
      review: { count: jest.fn() },
      order: { groupBy: jest.fn() },
      booking: { count: jest.fn(), groupBy: jest.fn() },
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

  describe('listUsers', () => {
    it('filters by search across email and displayName', async () => {
      const { service, prisma } = buildService();
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.listUsers({ search: 'jane', page: 1, limit: 20 } as any);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { email: { contains: 'jane', mode: 'insensitive' } },
              { displayName: { contains: 'jane', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('filters by role using an array-contains check', async () => {
      const { service, prisma } = buildService();
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.listUsers({ role: 'INSTRUCTOR', page: 1, limit: 20 } as any);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { roles: { has: 'INSTRUCTOR' } } }),
      );
    });

    it('returns paginated results with total', async () => {
      const { service, prisma } = buildService();
      prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.listUsers({ page: 2, limit: 10 } as any);

      expect(result).toEqual({ items: [{ id: 'user-1' }], total: 1, page: 2, limit: 10 });
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    });
  });

  describe('getMetrics', () => {
    it('fills in zero counts for course/booking statuses with no rows', async () => {
      const { service, prisma } = buildService();
      prisma.user.count
        .mockResolvedValueOnce(10) // totalUsers
        .mockResolvedValueOnce(6) // STUDENT
        .mockResolvedValueOnce(2) // INSTRUCTOR
        .mockResolvedValueOnce(1) // MENTOR
        .mockResolvedValueOnce(1); // ADMIN
      prisma.course.count.mockResolvedValue(3);
      prisma.course.groupBy.mockResolvedValue([{ status: 'PUBLISHED', _count: { _all: 3 } }]);
      prisma.enrollment.count.mockResolvedValue(5);
      prisma.review.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1);
      prisma.order.groupBy.mockResolvedValue([
        { currency: 'USD', _sum: { amountCents: 5000 }, _count: { _all: 2 } },
      ]);
      prisma.booking.count.mockResolvedValue(2);
      prisma.booking.groupBy.mockResolvedValue([{ status: 'CONFIRMED', _count: { _all: 2 } }]);

      const metrics = await service.getMetrics();

      expect(metrics.users).toEqual({ total: 10, byRole: { STUDENT: 6, INSTRUCTOR: 2, MENTOR: 1, ADMIN: 1 } });
      expect(metrics.courses).toEqual({
        total: 3,
        byStatus: { DRAFT: 0, PENDING_REVIEW: 0, PUBLISHED: 3, REJECTED: 0, ARCHIVED: 0 },
      });
      expect(metrics.enrollments).toEqual({ total: 5 });
      expect(metrics.reviews).toEqual({ total: 4, hidden: 1 });
      expect(metrics.revenue).toEqual({ byCurrency: [{ currency: 'USD', totalCents: 5000, orderCount: 2 }] });
      expect(metrics.bookings).toEqual({
        total: 2,
        byStatus: { PENDING_PAYMENT: 0, CONFIRMED: 2, CANCELLED: 0 },
      });
    });
  });
});
