import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ListCoursesQueryDto } from './dto/list-courses.query.dto';

const COURSE_LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  category: true,
  language: true,
  priceCents: true,
  currency: true,
} as const;

function withIsFree<T extends { priceCents: number }>(course: T) {
  return { ...course, isFree: course.priceCents === 0 };
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCoursesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      status: 'PUBLISHED' as const,
      ...(query.category ? { category: query.category } : {}),
      ...(query.language ? { language: query.language } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        select: COURSE_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      items: items.map(withIsFree),
      total,
      page,
      limit,
    };
  }

  async findBySlug(slug: string) {
    const course = await this.prisma.course.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: {
        ...COURSE_LIST_SELECT,
        modules: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            order: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                order: true,
                durationSec: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return withIsFree(course);
  }
}
