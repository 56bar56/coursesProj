import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
  ) {}

  async listPendingCourses() {
    return this.prisma.course.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { createdAt: 'asc' },
      include: {
        ownerInstructor: { select: { id: true, displayName: true, email: true } },
        modules: { include: { lessons: true } },
      },
    });
  }

  private async findPendingOrThrow(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    if (course.status !== 'PENDING_REVIEW') {
      throw new ConflictException('Course is not awaiting review');
    }
    return course;
  }

  async approve(courseId: string) {
    await this.findPendingOrThrow(courseId);
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'PUBLISHED', rejectionReason: null },
    });
  }

  async reject(courseId: string, reason: string) {
    await this.findPendingOrThrow(courseId);
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'REJECTED', rejectionReason: reason },
    });
  }

  async hideReview(reviewId: string) {
    return this.reviewsService.hide(reviewId);
  }
}
