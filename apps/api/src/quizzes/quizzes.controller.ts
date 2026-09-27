import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OriginCheckGuard } from '../common/guards/origin-check.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QuizzesService } from './quizzes.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import type { AuthenticatedUser } from '../auth/types';

@Controller('quizzes')
@UseGuards(JwtAuthGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post(':quizId/attempts')
  @UseGuards(OriginCheckGuard)
  startAttempt(@Param('quizId') quizId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quizzesService.startOrResumeAttempt(user.sub, quizId);
  }

  @Get('attempts/:attemptId')
  getAttempt(@Param('attemptId') attemptId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quizzesService.getAttempt(user.sub, attemptId);
  }

  @Post('attempts/:attemptId/submit')
  @UseGuards(OriginCheckGuard)
  submitAttempt(
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitAttemptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quizzesService.submitAttempt(user.sub, attemptId, dto.answers);
  }

  @Get(':quizId/attempts')
  listPastAttempts(@Param('quizId') quizId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quizzesService.listPastAttempts(user.sub, quizId);
  }
}
