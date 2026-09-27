import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OriginCheckGuard } from '../common/guards/origin-check.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiChatService } from './ai-chat.service';
import { ExplainMistakeDto } from './dto/explain-mistake.dto';
import type { AuthenticatedUser } from '../auth/types';

@Controller('quizzes/attempts/:attemptId/questions/:questionId')
@UseGuards(JwtAuthGuard)
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post('explain')
  @HttpCode(200)
  @UseGuards(OriginCheckGuard)
  explain(
    @Param('attemptId') attemptId: string,
    @Param('questionId') questionId: string,
    @Body() dto: ExplainMistakeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiChatService.explainMistake(user.sub, attemptId, questionId, dto);
  }
}
