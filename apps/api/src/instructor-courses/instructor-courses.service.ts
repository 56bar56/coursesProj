import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from './slugify';
import type { CreateCourseDto } from './dto/create-course.dto';
import type { UpdateCourseDto } from './dto/update-course.dto';
import type { CreateModuleDto } from './dto/create-module.dto';
import type { UpdateModuleDto } from './dto/update-module.dto';
import type { CreateLessonDto } from './dto/create-lesson.dto';
import type { UpdateLessonDto } from './dto/update-lesson.dto';

const EDITABLE_STATUSES = new Set(['DRAFT', 'REJECTED']);

@Injectable()
export class InstructorCoursesService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOwnedOrThrow(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.ownerInstructorId !== userId) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  private assertEditable(status: string) {
    if (!EDITABLE_STATUSES.has(status)) {
      throw new ConflictException('This course cannot be edited in its current state');
    }
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    let suffix = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await this.prisma.course.findUnique({ where: { slug: candidate } })) {
      suffix++;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  async createCourse(userId: string, dto: CreateCourseDto) {
    const slug = await this.generateUniqueSlug(dto.title);
    return this.prisma.course.create({
      data: {
        slug,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        language: dto.language ?? 'en',
        priceCents: dto.priceCents ?? 0,
        currency: dto.currency ?? 'USD',
        status: 'DRAFT',
        ownerInstructorId: userId,
      },
    });
  }

  async listMine(userId: string) {
    return this.prisma.course.findMany({
      where: { ownerInstructorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!course || course.ownerInstructorId !== userId) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  async updateCourse(userId: string, courseId: string, dto: UpdateCourseDto) {
    const course = await this.findOwnedOrThrow(userId, courseId);
    this.assertEditable(course.status);
    return this.prisma.course.update({ where: { id: courseId }, data: dto });
  }

  async deleteCourse(userId: string, courseId: string) {
    const course = await this.findOwnedOrThrow(userId, courseId);
    if (!EDITABLE_STATUSES.has(course.status)) {
      throw new ConflictException('Only draft or rejected courses can be deleted');
    }
    await this.prisma.course.delete({ where: { id: courseId } });
    return { success: true };
  }

  async submit(userId: string, courseId: string) {
    const course = await this.findOwnedOrThrow(userId, courseId);
    this.assertEditable(course.status);

    const lessonCount = await this.prisma.lesson.count({ where: { module: { courseId } } });
    if (lessonCount === 0) {
      throw new BadRequestException('Add at least one lesson before submitting for review');
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'PENDING_REVIEW', rejectionReason: null },
    });
  }

  async addModule(userId: string, courseId: string, dto: CreateModuleDto) {
    const course = await this.findOwnedOrThrow(userId, courseId);
    this.assertEditable(course.status);

    const agg = await this.prisma.module.aggregate({ where: { courseId }, _max: { order: true } });
    const order = (agg._max.order ?? 0) + 10;

    return this.prisma.module.create({ data: { courseId, title: dto.title, order } });
  }

  private async findOwnedModuleOrThrow(userId: string, courseId: string, moduleId: string) {
    const course = await this.findOwnedOrThrow(userId, courseId);
    const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!module || module.courseId !== courseId) {
      throw new NotFoundException('Module not found');
    }
    return { course, module };
  }

  async updateModule(userId: string, courseId: string, moduleId: string, dto: UpdateModuleDto) {
    const { course } = await this.findOwnedModuleOrThrow(userId, courseId, moduleId);
    this.assertEditable(course.status);
    return this.prisma.module.update({ where: { id: moduleId }, data: { title: dto.title } });
  }

  async deleteModule(userId: string, courseId: string, moduleId: string) {
    const { course } = await this.findOwnedModuleOrThrow(userId, courseId, moduleId);
    this.assertEditable(course.status);
    await this.prisma.module.delete({ where: { id: moduleId } });
    return { success: true };
  }

  async addLesson(userId: string, courseId: string, moduleId: string, dto: CreateLessonDto) {
    const { course } = await this.findOwnedModuleOrThrow(userId, courseId, moduleId);
    this.assertEditable(course.status);

    const agg = await this.prisma.lesson.aggregate({ where: { moduleId }, _max: { order: true } });
    const order = (agg._max.order ?? 0) + 10;

    return this.prisma.lesson.create({
      data: { moduleId, type: 'TEXT', title: dto.title, textContent: dto.textContent, order },
    });
  }

  private async findOwnedLessonOrThrow(userId: string, courseId: string, moduleId: string, lessonId: string) {
    const { course } = await this.findOwnedModuleOrThrow(userId, courseId, moduleId);
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson || lesson.moduleId !== moduleId) {
      throw new NotFoundException('Lesson not found');
    }
    return { course, lesson };
  }

  async updateLesson(userId: string, courseId: string, moduleId: string, lessonId: string, dto: UpdateLessonDto) {
    const { course } = await this.findOwnedLessonOrThrow(userId, courseId, moduleId, lessonId);
    this.assertEditable(course.status);
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.textContent !== undefined ? { textContent: dto.textContent } : {}),
      },
    });
  }

  async deleteLesson(userId: string, courseId: string, moduleId: string, lessonId: string) {
    const { course } = await this.findOwnedLessonOrThrow(userId, courseId, moduleId, lessonId);
    this.assertEditable(course.status);
    await this.prisma.lesson.delete({ where: { id: lessonId } });
    return { success: true };
  }
}
