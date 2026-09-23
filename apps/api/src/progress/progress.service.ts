import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  private async getEnrollmentForLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const courseId = lesson.module.courseId;
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) {
      throw new ForbiddenException('Enroll in this course to track progress');
    }

    return { lesson, courseId, enrollment };
  }

  private async recomputeEnrollmentProgress(enrollmentId: string, courseId: string) {
    const totalLessons = await this.prisma.lesson.count({
      where: { module: { courseId } },
    });
    const completedLessons = await this.prisma.lessonProgress.count({
      where: { enrollmentId, completed: true },
    });

    const progressPct = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progressPct,
        completedAt: progressPct === 100 ? new Date() : null,
      },
    });
  }

  async markComplete(userId: string, lessonId: string) {
    const { courseId, enrollment } = await this.getEnrollmentForLesson(userId, lessonId);

    await this.prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: { enrollmentId: enrollment.id, lessonId, completed: true, completedAt: new Date() },
      update: { completed: true, completedAt: new Date() },
    });

    await this.recomputeEnrollmentProgress(enrollment.id, courseId);

    return { success: true };
  }

  async updatePosition(userId: string, lessonId: string, positionSec: number) {
    const { enrollment } = await this.getEnrollmentForLesson(userId, lessonId);

    await this.prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: { enrollmentId: enrollment.id, lessonId, lastPositionSec: positionSec },
      update: { lastPositionSec: positionSec },
    });

    return { success: true };
  }

  async getCourseProgress(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) {
      throw new ForbiddenException('Not enrolled in this course');
    }

    const completed = await this.prisma.lessonProgress.findMany({
      where: { enrollmentId: enrollment.id, completed: true },
      select: { lessonId: true },
    });

    return {
      progressPct: enrollment.progressPct,
      completedLessonIds: completed.map((c) => c.lessonId),
    };
  }
}
