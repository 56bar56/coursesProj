import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async enrollFree(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.status !== 'PUBLISHED') {
      throw new NotFoundException('Course not found');
    }
    if (course.priceCents !== 0) {
      throw new BadRequestException('This course is not free; paid enrollment is not available yet');
    }

    return this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId },
      update: {},
    });
  }

  async listMine(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            category: true,
            priceCents: true,
            currency: true,
          },
        },
      },
    });

    return enrollments.map((e) => ({
      id: e.id,
      progressPct: e.progressPct,
      completedAt: e.completedAt,
      enrolledAt: e.enrolledAt,
      course: { ...e.course, isFree: e.course.priceCents === 0 },
    }));
  }
}
