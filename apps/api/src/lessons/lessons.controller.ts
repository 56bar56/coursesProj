import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LessonsService } from './lessons.service';
import type { AuthenticatedUser } from '../auth/types';

@Controller('lessons')
@UseGuards(JwtAuthGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get(':id')
  getLesson(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.lessonsService.getLesson(id, user.sub);
  }
}
