import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/enums';
import { MentorsService } from './mentors.service';
import { ListAvailabilityQueryDto } from './dto/list-availability.query.dto';
import type { AuthenticatedUser } from '../auth/types';

@Controller('mentors')
export class MentorsController {
  constructor(private readonly mentorsService: MentorsService) {}

  @Get()
  listMentors() {
    return this.mentorsService.listMentors();
  }

  // Registered before the ':mentorId/availability' wildcard route below,
  // otherwise Nest would match "me" as a mentorId value.
  @Get('me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  listMyAvailability(@CurrentUser() user: AuthenticatedUser) {
    return this.mentorsService.listMyAvailability(user.sub);
  }

  @Get('me/bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MENTOR)
  listMyBookings(@CurrentUser() user: AuthenticatedUser) {
    return this.mentorsService.listMyBookings(user.sub);
  }

  @Get(':mentorId/availability')
  listAvailability(@Param('mentorId') mentorId: string, @Query() query: ListAvailabilityQueryDto) {
    return this.mentorsService.listAvailability(mentorId, query.from, query.to);
  }
}
