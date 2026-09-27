import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { isAnswerCorrect } from './scoring';
import type { AnswerDto } from './dto/submit-attempt.dto';

const LATE_GRACE_SEC = 15;

export interface PublicQuestion {
  id: string;
  order: number;
  text: string;
  type: string;
  options: string[];
}

export interface ReportQuestion {
  id: string;
  order: number;
  text: string;
  type: string;
  options: string[];
  explanation: string | null;
}

export interface AttemptLike {
  id: string;
  startedAt: Date;
  submittedAt: Date | null;
  scorePct: number | null;
  isLate: boolean;
}

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: ProgressService,
  ) {}

  private toPublicQuestion(q: PublicQuestion): PublicQuestion {
    return { id: q.id, order: q.order, text: q.text, type: q.type, options: q.options };
  }

  private async buildReport(attempt: AttemptLike, questions: ReportQuestion[]) {
    const answers = await this.prisma.attemptAnswer.findMany({ where: { attemptId: attempt.id } });
    const answersByQuestion = new Map(answers.map((a) => [a.questionId, a]));

    return {
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      scorePct: attempt.scorePct,
      isLate: attempt.isLate,
      questions: questions.map((q) => {
        const a = answersByQuestion.get(q.id);
        return {
          id: q.id,
          order: q.order,
          text: q.text,
          type: q.type,
          options: q.options,
          explanation: q.explanation,
          selectedOptionIndex: a?.selectedOptionIndex ?? null,
          numericAnswer: a?.numericAnswer ?? null,
          isCorrect: a?.isCorrect ?? null,
          timeSpentSec: a?.timeSpentSec ?? null,
        };
      }),
    };
  }

  async startOrResumeAttempt(userId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { order: 'asc' } }, lesson: { include: { module: true } } },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const courseId = quiz.lesson.module.courseId;
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) {
      throw new ForbiddenException('Enroll in this course to take this quiz');
    }

    let attempt = await this.prisma.attempt.findFirst({
      where: { userId, quizId, submittedAt: null },
    });
    if (!attempt) {
      attempt = await this.prisma.attempt.create({ data: { userId, quizId } });
    }

    return {
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      timeLimitSec: quiz.timeLimitSec,
      questions: quiz.questions.map((q) => this.toPublicQuestion(q)),
    };
  }

  async getAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { questions: { orderBy: { order: 'asc' } } } } },
    });
    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Attempt not found');
    }

    if (!attempt.submittedAt) {
      return {
        attemptId: attempt.id,
        startedAt: attempt.startedAt,
        timeLimitSec: attempt.quiz.timeLimitSec,
        questions: attempt.quiz.questions.map((q) => this.toPublicQuestion(q)),
      };
    }

    return this.buildReport(attempt, attempt.quiz.questions);
  }

  async submitAttempt(userId: string, attemptId: string, answers: AnswerDto[]) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: { include: { questions: { orderBy: { order: 'asc' } }, lesson: { include: { module: true } } } },
      },
    });
    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Attempt not found');
    }

    if (attempt.submittedAt) {
      // Already finalized (double-click/retry) — return the existing report idempotently.
      return this.buildReport(attempt, attempt.quiz.questions);
    }

    const courseId = attempt.quiz.lesson.module.courseId;
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) {
      throw new ForbiddenException('Enroll in this course to submit this quiz');
    }

    const validQuestionIds = new Set(attempt.quiz.questions.map((q) => q.id));
    const seen = new Set<string>();
    const answersByQuestion = new Map<string, AnswerDto>();
    for (const answer of answers) {
      if (!validQuestionIds.has(answer.questionId) || seen.has(answer.questionId)) {
        continue;
      }
      seen.add(answer.questionId);
      answersByQuestion.set(answer.questionId, answer);
    }

    let correctCount = 0;
    const answerRows = attempt.quiz.questions.map((q) => {
      const answer = answersByQuestion.get(q.id);
      const isCorrect = isAnswerCorrect(q, answer);
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        selectedOptionIndex: answer?.selectedOptionIndex ?? null,
        numericAnswer: answer?.numericAnswer ?? null,
        isCorrect,
        timeSpentSec: answer?.timeSpentSec ?? null,
      };
    });
    const scorePct =
      attempt.quiz.questions.length === 0 ? 0 : Math.round((correctCount / attempt.quiz.questions.length) * 100);

    const now = new Date();
    const timeLimitSec = attempt.quiz.timeLimitSec;
    const isLate =
      timeLimitSec != null && (now.getTime() - attempt.startedAt.getTime()) / 1000 > timeLimitSec + LATE_GRACE_SEC;

    const claimed = await this.prisma.$transaction(async (tx) => {
      const result = await tx.attempt.updateMany({
        where: { id: attemptId, submittedAt: null },
        data: { submittedAt: now, scorePct, isLate },
      });
      if (result.count === 0) {
        return false;
      }
      await tx.attemptAnswer.createMany({
        data: answerRows.map((row) => ({ attemptId, ...row })),
      });
      return true;
    });

    if (!claimed) {
      // Lost the race to a concurrent submit for this same attempt — return that result idempotently.
      const finalAttempt = await this.prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
      return this.buildReport(finalAttempt, attempt.quiz.questions);
    }

    await this.progressService.markComplete(userId, attempt.quiz.lessonId);

    return this.buildReport({ ...attempt, submittedAt: now, scorePct, isLate }, attempt.quiz.questions);
  }

  async listPastAttempts(userId: string, quizId: string) {
    return this.prisma.attempt.findMany({
      where: { userId, quizId, submittedAt: { not: null } },
      orderBy: { submittedAt: 'desc' },
      select: { id: true, scorePct: true, submittedAt: true, isLate: true },
    });
  }
}
