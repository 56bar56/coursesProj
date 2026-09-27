import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OriginCheckGuard } from '../common/guards/origin-check.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import type { AuthenticatedUser } from '../auth/types';

@Controller('courses/:courseId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  list(@Param('courseId') courseId: string) {
    return this.reviewsService.list(courseId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, OriginCheckGuard)
  upsert(
    @Param('courseId') courseId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.upsert(user.sub, courseId, dto);
  }
}
