import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LessonsService } from './lessons.service';

describe('LessonsService', () => {
  const courseId = 'course-1';
  const enrollment = { id: 'enrollment-1', userId: 'user-1', courseId };

  function buildService(lesson: any, enrollmentRow: any = enrollment, progress: any = null) {
    const prisma = {
      lesson: { findUnique: jest.fn().mockResolvedValue(lesson) },
      enrollment: { findUnique: jest.fn().mockResolvedValue(enrollmentRow) },
      lessonProgress: { findUnique: jest.fn().mockResolvedValue(progress) },
    };
    const signedUrl = { sign: jest.fn().mockReturnValue('signed-token') };
    return { service: new LessonsService(prisma as any, signedUrl as any), prisma, signedUrl };
  }

  it('throws NotFoundException when the lesson does not exist', async () => {
    const { service } = buildService(null);
    await expect(service.getLesson('missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ForbiddenException when the user is not enrolled in the course', async () => {
    const lesson = { id: 'lesson-1', type: 'TEXT', title: 'x', textContent: 'y', module: { courseId } };
    const { service } = buildService(lesson, null);
    await expect(service.getLesson('lesson-1', 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns textContent directly for a TEXT lesson when enrolled', async () => {
    const lesson = { id: 'lesson-1', type: 'TEXT', title: 'x', textContent: 'hello', module: { courseId } };
    const { service } = buildService(lesson);
    const result = await service.getLesson('lesson-1', 'user-1');
    expect(result).toMatchObject({ type: 'TEXT', textContent: 'hello' });
  });

  it('returns a signed stream URL and resume position for a VIDEO lesson', async () => {
    const lesson = {
      id: 'lesson-1',
      type: 'VIDEO',
      title: 'x',
      storageKey: 'sample.mp4',
      durationSec: 120,
      module: { courseId },
    };
    const { service, signedUrl } = buildService(lesson, enrollment, { lastPositionSec: 42 });
    const result = await service.getLesson('lesson-1', 'user-1');
    expect(signedUrl.sign).toHaveBeenCalledWith({ lessonId: 'lesson-1', userId: 'user-1', purpose: 'stream' });
    expect(result).toMatchObject({ type: 'VIDEO', durationSec: 120, lastPositionSec: 42 });
    expect((result as any).streamUrl).toContain('/api/storage/stream/lesson-1?token=');
  });

  it('returns a signed download URL for a RESOURCE lesson', async () => {
    const lesson = {
      id: 'lesson-1',
      type: 'RESOURCE',
      title: 'x',
      storageKey: 'sheet.txt',
      fileName: 'sheet.txt',
      mimeType: 'text/plain',
      sizeBytes: 10,
      module: { courseId },
    };
    const { service, signedUrl } = buildService(lesson);
    const result = await service.getLesson('lesson-1', 'user-1');
    expect(signedUrl.sign).toHaveBeenCalledWith({ lessonId: 'lesson-1', userId: 'user-1', purpose: 'download' });
    expect(result).toMatchObject({ type: 'RESOURCE', fileName: 'sheet.txt' });
  });

  it('returns a comingSoon placeholder for a QUIZ lesson', async () => {
    const lesson = { id: 'lesson-1', type: 'QUIZ', title: 'x', module: { courseId } };
    const { service } = buildService(lesson);
    const result = await service.getLesson('lesson-1', 'user-1');
    expect(result).toMatchObject({ type: 'QUIZ', comingSoon: true });
  });
});
