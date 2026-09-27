import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';

describe('QuizzesService', () => {
  const quizFixture = {
    id: 'quiz-1',
    timeLimitSec: 60,
    lessonId: 'lesson-1',
    lesson: { id: 'lesson-1', module: { courseId: 'course-1' } },
    questions: [
      {
        id: 'q1',
        quizId: 'quiz-1',
        order: 10,
        text: 'Q1',
        type: 'MULTIPLE_CHOICE',
        options: ['a', 'b'],
        correctOptionIndex: 0,
        correctNumericAnswer: null,
        explanation: 'exp1',
      },
      {
        id: 'q2',
        quizId: 'quiz-1',
        order: 20,
        text: 'Q2',
        type: 'NUMERIC_ENTRY',
        options: [],
        correctOptionIndex: null,
        correctNumericAnswer: '5',
        explanation: 'exp2',
      },
    ],
  };

  function buildService() {
    const prisma: any = {
      quiz: { findUnique: jest.fn().mockResolvedValue(quizFixture) },
      enrollment: { findUnique: jest.fn().mockResolvedValue({ id: 'enrollment-1' }) },
      attempt: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'attempt-1',
          userId: 'user-1',
          quizId: 'quiz-1',
          startedAt: new Date(),
          submittedAt: null,
          scorePct: null,
          isLate: false,
        }),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      attemptAnswer: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    prisma.$transaction = jest.fn((cb: (tx: unknown) => unknown) => cb(prisma));

    const progressService = { markComplete: jest.fn().mockResolvedValue({ success: true }) };
    const service = new QuizzesService(prisma, progressService as any);
    return { service, prisma, progressService };
  }

  function buildAttempt(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'attempt-1',
      userId: 'user-1',
      quizId: 'quiz-1',
      startedAt: new Date(Date.now() - 10_000),
      submittedAt: null,
      scorePct: null,
      isLate: false,
      quiz: quizFixture,
      ...overrides,
    };
  }

  describe('startOrResumeAttempt', () => {
    it('throws when the quiz does not exist', async () => {
      const { service, prisma } = buildService();
      prisma.quiz.findUnique.mockResolvedValue(null);
      await expect(service.startOrResumeAttempt('user-1', 'quiz-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when the user is not enrolled', async () => {
      const { service, prisma } = buildService();
      prisma.enrollment.findUnique.mockResolvedValue(null);
      await expect(service.startOrResumeAttempt('user-1', 'quiz-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates a new attempt when none is open, and never leaks correct answers', async () => {
      const { service, prisma } = buildService();
      const result = await service.startOrResumeAttempt('user-1', 'quiz-1');

      expect(prisma.attempt.create).toHaveBeenCalledWith({ data: { userId: 'user-1', quizId: 'quiz-1' } });
      expect(result.questions).toHaveLength(2);
      for (const q of result.questions) {
        expect(q).not.toHaveProperty('correctOptionIndex');
        expect(q).not.toHaveProperty('correctNumericAnswer');
        expect(q).not.toHaveProperty('explanation');
      }
    });

    it('resumes an existing open attempt instead of creating a new one', async () => {
      const { service, prisma } = buildService();
      const existing = { id: 'attempt-existing', startedAt: new Date(), submittedAt: null };
      prisma.attempt.findFirst.mockResolvedValue(existing);

      const result = await service.startOrResumeAttempt('user-1', 'quiz-1');

      expect(prisma.attempt.create).not.toHaveBeenCalled();
      expect(result.attemptId).toBe('attempt-existing');
    });
  });

  describe('submitAttempt', () => {
    it('throws when the attempt does not belong to the caller', async () => {
      const { service, prisma } = buildService();
      prisma.attempt.findUnique.mockResolvedValue(buildAttempt({ userId: 'someone-else' }));
      await expect(service.submitAttempt('user-1', 'attempt-1', [])).rejects.toBeInstanceOf(NotFoundException);
    });

    it('scores multiple-choice and numeric-entry answers correctly', async () => {
      const { service, prisma, progressService } = buildService();
      prisma.attempt.findUnique.mockResolvedValue(buildAttempt());

      const result = await service.submitAttempt('user-1', 'attempt-1', [
        { questionId: 'q1', selectedOptionIndex: 0 },
        { questionId: 'q2', numericAnswer: '5.0' },
      ]);

      expect(result.scorePct).toBe(100);
      expect(prisma.attempt.updateMany).toHaveBeenCalledWith({
        where: { id: 'attempt-1', submittedAt: null },
        data: { submittedAt: expect.any(Date), scorePct: 100, isLate: false },
      });
      expect(progressService.markComplete).toHaveBeenCalledWith('user-1', 'lesson-1');
    });

    it('filters out answers for unknown or duplicate question ids', async () => {
      const { service, prisma } = buildService();
      prisma.attempt.findUnique.mockResolvedValue(buildAttempt());

      const result = await service.submitAttempt('user-1', 'attempt-1', [
        { questionId: 'q1', selectedOptionIndex: 0 },
        { questionId: 'q1', selectedOptionIndex: 1 }, // duplicate — ignored
        { questionId: 'not-a-real-question', selectedOptionIndex: 0 }, // unknown — ignored
      ]);

      // q1 correct (first occurrence wins), q2 unanswered -> 1/2 = 50%
      expect(result.scorePct).toBe(50);
    });

    it('flags a submission past the time limit plus grace as late, but still scores it', async () => {
      const { service, prisma } = buildService();
      const startedAt = new Date(Date.now() - 100_000); // 100s ago, limit is 60s + 15s grace
      prisma.attempt.findUnique.mockResolvedValue(buildAttempt({ startedAt }));

      const result = await service.submitAttempt('user-1', 'attempt-1', [{ questionId: 'q1', selectedOptionIndex: 0 }]);

      expect(result.isLate).toBe(true);
      expect(result.scorePct).toBe(50);
    });

    it('returns the existing report idempotently when the attempt is already submitted', async () => {
      const { service, prisma, progressService } = buildService();
      prisma.attempt.findUnique.mockResolvedValue(
        buildAttempt({ submittedAt: new Date(), scorePct: 100, isLate: false }),
      );

      const result = await service.submitAttempt('user-1', 'attempt-1', [{ questionId: 'q1', selectedOptionIndex: 0 }]);

      expect(result.scorePct).toBe(100);
      expect(prisma.attempt.updateMany).not.toHaveBeenCalled();
      expect(progressService.markComplete).not.toHaveBeenCalled();
    });

    it('is idempotent under a concurrent double-submit race: only the winner inserts answers and marks progress', async () => {
      const { service, prisma, progressService } = buildService();
      prisma.attempt.findUnique.mockResolvedValue(buildAttempt());
      prisma.attempt.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });
      prisma.attempt.findUniqueOrThrow.mockResolvedValue(
        buildAttempt({ submittedAt: new Date(), scorePct: 50, isLate: false }),
      );

      const answers = [{ questionId: 'q1', selectedOptionIndex: 0 }];
      await Promise.all([
        service.submitAttempt('user-1', 'attempt-1', answers),
        service.submitAttempt('user-1', 'attempt-1', answers),
      ]);

      expect(prisma.attemptAnswer.createMany).toHaveBeenCalledTimes(1);
      expect(progressService.markComplete).toHaveBeenCalledTimes(1);
    });
  });
});
