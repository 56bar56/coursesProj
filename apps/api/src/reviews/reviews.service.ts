import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(courseId: string) {
    const [items, total, aggregate] = await Promise.all([
      this.prisma.review.findMany({
        where: { courseId, hidden: false },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, displayName: true } } },
      }),
      this.prisma.review.count({ where: { courseId, hidden: false } }),
      this.prisma.review.aggregate({ where: { courseId, hidden: false }, _avg: { rating: true } }),
    ]);

    return { items, total, averageRating: aggregate._avg.rating };
  }

  async upsert(userId: string, courseId: string, dto: CreateReviewDto) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) {
      throw new ForbiddenException('Enroll in this course to leave a review');
    }

    return this.prisma.review.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, rating: dto.rating, text: dto.text },
      update: { rating: dto.rating, text: dto.text },
    });
  }

  async hide(reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return this.prisma.review.update({ where: { id: reviewId }, data: { hidden: true } });
  }
}
