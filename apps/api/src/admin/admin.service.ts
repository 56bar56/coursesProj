import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';
import { BookingStatus, CourseStatus, Role } from '../generated/prisma/enums';
import type { ListUsersQueryDto } from './dto/list-users.query.dto';

const USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  locale: true,
  roles: true,
  emailVerified: true,
  createdAt: true,
} as const;

function fillCounts<T extends string>(values: readonly T[], rows: Array<{ status: T; _count: number }>) {
  const map = Object.fromEntries(values.map((v) => [v, 0])) as Record<T, number>;
  for (const row of rows) {
    map[row.status] = row._count;
  }
  return map;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
  ) {}

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { displayName: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.role ? { roles: { has: query.role } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { ...USER_SELECT, _count: { select: { coursesOwned: true, enrollments: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getMetrics() {
    const roles = Object.values(Role);
    const courseStatuses = Object.values(CourseStatus);
    const bookingStatuses = Object.values(BookingStatus);

    const [
      totalUsers,
      roleCounts,
      totalCourses,
      courseStatusRows,
      totalEnrollments,
      totalReviews,
      hiddenReviews,
      revenueRows,
      totalBookings,
      bookingStatusRows,
    ] = await Promise.all([
      this.prisma.user.count(),
      Promise.all(roles.map((role) => this.prisma.user.count({ where: { roles: { has: role } } }))),
      this.prisma.course.count(),
      this.prisma.course.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.enrollment.count(),
      this.prisma.review.count(),
      this.prisma.review.count({ where: { hidden: true } }),
      this.prisma.order.groupBy({
        by: ['currency'],
        where: { status: 'PAID' },
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      this.prisma.booking.count(),
      this.prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    return {
      users: {
        total: totalUsers,
        byRole: Object.fromEntries(roles.map((role, i) => [role, roleCounts[i]])) as Record<Role, number>,
      },
      courses: {
        total: totalCourses,
        byStatus: fillCounts(
          courseStatuses,
          courseStatusRows.map((r) => ({ status: r.status, _count: r._count._all })),
        ),
      },
      enrollments: { total: totalEnrollments },
      reviews: { total: totalReviews, hidden: hiddenReviews },
      revenue: {
        byCurrency: revenueRows.map((r) => ({
          currency: r.currency,
          totalCents: r._sum.amountCents ?? 0,
          orderCount: r._count._all,
        })),
      },
      bookings: {
        total: totalBookings,
        byStatus: fillCounts(
          bookingStatuses,
          bookingStatusRows.map((r) => ({ status: r.status, _count: r._count._all })),
        ),
      },
    };
  }

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
