import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';

describe('EnrollmentsService', () => {
  function buildService(course: { status: string; priceCents: number } | null) {
    const prisma = {
      course: { findUnique: jest.fn().mockResolvedValue(course) },
      enrollment: {
        upsert: jest.fn().mockResolvedValue({ id: 'enrollment-1', userId: 'user-1', courseId: 'course-1' }),
        findMany: jest.fn(),
      },
    };
    return { service: new EnrollmentsService(prisma as any), prisma };
  }

  it('rejects enrollment when the course does not exist', async () => {
    const { service } = buildService(null);
    await expect(service.enrollFree('user-1', 'course-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects enrollment when the course is not published', async () => {
    const { service } = buildService({ status: 'DRAFT', priceCents: 0 });
    await expect(service.enrollFree('user-1', 'course-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects enrollment when the course is not free', async () => {
    const { service } = buildService({ status: 'PUBLISHED', priceCents: 5000 });
    await expect(service.enrollFree('user-1', 'course-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('is idempotent for a free, published course: upserts rather than erroring on repeat enrollment', async () => {
    const { service, prisma } = buildService({ status: 'PUBLISHED', priceCents: 0 });

    await service.enrollFree('user-1', 'course-1');
    await service.enrollFree('user-1', 'course-1');

    expect(prisma.enrollment.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.enrollment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_courseId: { userId: 'user-1', courseId: 'course-1' } },
        update: {},
      }),
    );
  });
});
