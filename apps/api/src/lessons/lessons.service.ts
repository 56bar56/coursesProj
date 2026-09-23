import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignedUrlService } from '../storage/signed-url.service';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signedUrl: SignedUrlService,
  ) {}

  async getLesson(lessonId: string, userId: string) {
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
      throw new ForbiddenException('Enroll in this course to access its lessons');
    }

    const base = { id: lesson.id, title: lesson.title, type: lesson.type };

    switch (lesson.type) {
      case 'TEXT':
        return { ...base, textContent: lesson.textContent };

      case 'VIDEO': {
        const progress = await this.prisma.lessonProgress.findUnique({
          where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id } },
        });
        const streamUrl = lesson.storageKey
          ? `/api/storage/stream/${lesson.id}?token=${encodeURIComponent(
              this.signedUrl.sign({ lessonId: lesson.id, userId, purpose: 'stream' }),
            )}`
          : null;
        return {
          ...base,
          streamUrl,
          durationSec: lesson.durationSec,
          lastPositionSec: progress?.lastPositionSec ?? null,
        };
      }

      case 'RESOURCE': {
        const downloadUrl = lesson.storageKey
          ? `/api/storage/download/${lesson.id}?token=${encodeURIComponent(
              this.signedUrl.sign({ lessonId: lesson.id, userId, purpose: 'download' }),
            )}`
          : null;
        return {
          ...base,
          downloadUrl,
          fileName: lesson.fileName,
          mimeType: lesson.mimeType,
          sizeBytes: lesson.sizeBytes,
        };
      }

      case 'QUIZ':
      default:
        return { ...base, comingSoon: true };
    }
  }
}
