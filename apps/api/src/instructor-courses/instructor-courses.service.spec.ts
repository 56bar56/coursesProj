import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InstructorCoursesService } from './instructor-courses.service';

describe('InstructorCoursesService', () => {
  const userId = 'instructor-1';
  const courseId = 'course-1';

  function buildService(overrides: Record<string, any> = {}) {
    const prisma = {
      course: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
      module: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { order: null } }),
      },
      lesson: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { order: null } }),
      },
      ...overrides,
    };
    return { service: new InstructorCoursesService(prisma as any), prisma };
  }

  describe('ownership checks', () => {
    it('throws NotFoundException when updating a course owned by another instructor', async () => {
      const { service, prisma } = buildService();
      prisma.course.findUnique.mockResolvedValue({ id: courseId, ownerInstructorId: 'someone-else', status: 'DRAFT' });
      await expect(service.updateCourse(userId, courseId, { title: 'x' } as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the course does not exist', async () => {
      const { service, prisma } = buildService();
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(service.updateCourse(userId, courseId, { title: 'x' } as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('editable-state guard', () => {
    it.each(['PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED'])('throws ConflictException when updating a %s course', async (status) => {
      const { service, prisma } = buildService();
      prisma.course.findUnique.mockResolvedValue({ id: courseId, ownerInstructorId: userId, status });
      await expect(service.updateCourse(userId, courseId, { title: 'x' } as any)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it.each(['DRAFT', 'REJECTED'])('allows updating a %s course', async (status) => {
      const { service, prisma } = buildService();
      prisma.course.findUnique.mockResolvedValue({ id: courseId, ownerInstructorId: userId, status });
      prisma.course.update.mockResolvedValue({ id: courseId });
      await expect(service.updateCourse(userId, courseId, { title: 'x' } as any)).resolves.toMatchObject({
        id: courseId,
      });
    });
  });

  describe('submit', () => {
    it('throws BadRequestException when the course has no lessons', async () => {
      const { service, prisma } = buildService();
      prisma.course.findUnique.mockResolvedValue({ id: courseId, ownerInstructorId: userId, status: 'DRAFT' });
      prisma.lesson.count.mockResolvedValue(0);
      await expect(service.submit(userId, courseId)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('transitions to PENDING_REVIEW and clears rejectionReason when the course has a lesson', async () => {
      const { service, prisma } = buildService();
      prisma.course.findUnique.mockResolvedValue({ id: courseId, ownerInstructorId: userId, status: 'REJECTED' });
      prisma.lesson.count.mockResolvedValue(1);
      prisma.course.update.mockResolvedValue({ id: courseId, status: 'PENDING_REVIEW' });
      await service.submit(userId, courseId);
      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: { status: 'PENDING_REVIEW', rejectionReason: null },
      });
    });
  });

  describe('deleteCourse', () => {
    it('throws ConflictException when the course is not DRAFT/REJECTED', async () => {
      const { service, prisma } = buildService();
      prisma.course.findUnique.mockResolvedValue({ id: courseId, ownerInstructorId: userId, status: 'PUBLISHED' });
      await expect(service.deleteCourse(userId, courseId)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('slug collision fallback', () => {
    it('appends a numeric suffix when the base slug is already taken', async () => {
      const { service, prisma } = buildService();
      prisma.course.findUnique
        .mockResolvedValueOnce({ id: 'other-course', slug: 'my-course' })
        .mockResolvedValueOnce(null);
      prisma.course.create.mockResolvedValue({ id: courseId, slug: 'my-course-2' });

      await service.createCourse(userId, {
        title: 'My Course',
        description: 'A course about things',
        category: 'programming',
      } as any);

      expect(prisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'my-course-2' }) }),
      );
    });
  });
});
