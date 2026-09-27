import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { Env } from '../config/env.schema';
import { LlmClientService } from './llm-client.service';
import { FixedWindowRateLimiter } from './rate-limiter';
import { buildMessages } from './mistake-prompt';
import type { ExplainMistakeDto } from './dto/explain-mistake.dto';

@Injectable()
export class AiChatService {
  private readonly limiter: FixedWindowRateLimiter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClientService,
    config: ConfigService<Env, true>,
  ) {
    this.limiter = new FixedWindowRateLimiter(config.get('AI_RATE_LIMIT_PER_MIN', { infer: true }), 60_000);
  }

  async explainMistake(userId: string, attemptId: string, questionId: string, dto: ExplainMistakeDto) {
    if (dto.messages.length > 0 && dto.messages[dto.messages.length - 1].role !== 'user') {
      throw new BadRequestException('The last message must be from the user');
    }

    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { lesson: { include: { module: { include: { course: true } } } } } } },
    });
    // Same existence-hiding convention as QuizzesService: someone else's attempt is a 404.
    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Attempt not found');
    }
    // The prompt contains the answer key, so it must never be reachable before submission.
    if (!attempt.submittedAt) {
      throw new BadRequestException('Submit the quiz before asking for explanations');
    }

    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question || question.quizId !== attempt.quizId) {
      throw new NotFoundException('Question not found');
    }
    const answer = await this.prisma.attemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId } },
    });

    // Checked after validation so malformed/foreign requests don't burn the user's quota.
    if (!this.limiter.tryConsume(userId)) {
      throw new HttpException('Too many AI requests, try again in a minute', HttpStatus.TOO_MANY_REQUESTS);
    }

    const reply = await this.llm.complete(
      buildMessages(
        {
          questionText: question.text,
          type: question.type,
          options: question.options,
          correctOptionIndex: question.correctOptionIndex,
          correctNumericAnswer: question.correctNumericAnswer,
          selectedOptionIndex: answer?.selectedOptionIndex ?? null,
          numericAnswer: answer?.numericAnswer ?? null,
          isCorrect: answer?.isCorrect ?? false,
          explanation: question.explanation,
          courseTitle: attempt.quiz.lesson.module.course.title,
          locale: dto.locale ?? 'en',
        },
        dto.messages,
      ),
    );

    return { reply };
  }
}
