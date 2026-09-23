import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OriginCheckGuard } from '../common/guards/origin-check.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EnrollmentsService } from './enrollments.service';
import { EnrollDto } from './dto/enroll.dto';
import type { AuthenticatedUser } from '../auth/types';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @UseGuards(OriginCheckGuard)
  enroll(@CurrentUser() user: AuthenticatedUser, @Body() dto: EnrollDto) {
    return this.enrollmentsService.enrollFree(user.sub, dto.courseId);
  }

  @Get('me')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.enrollmentsService.listMine(user.sub);
  }
}
