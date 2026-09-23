import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OriginCheckGuard } from '../common/guards/origin-check.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProgressService } from './progress.service';
import { UpdatePositionDto } from './dto/update-position.dto';
import type { AuthenticatedUser } from '../auth/types';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('lessons/:lessonId/complete')
  @UseGuards(OriginCheckGuard)
  markComplete(@Param('lessonId') lessonId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.progressService.markComplete(user.sub, lessonId);
  }

  @Patch('lessons/:lessonId/position')
  @UseGuards(OriginCheckGuard)
  updatePosition(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdatePositionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.progressService.updatePosition(user.sub, lessonId, dto.positionSec);
  }

  @Get('courses/:courseId')
  getCourseProgress(@Param('courseId') courseId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.progressService.getCourseProgress(user.sub, courseId);
  }
}
