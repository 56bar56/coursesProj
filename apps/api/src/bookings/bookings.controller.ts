import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OriginCheckGuard } from '../common/guards/origin-check.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import type { AuthenticatedUser } from '../auth/types';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(OriginCheckGuard)
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.createBooking(user.sub, dto.slotId);
  }

  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.listMine(user.sub);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.getOne(user.sub, id);
  }

  @Get(':id/ics')
  async getIcs(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const ics = await this.bookingsService.getIcs(user.sub, id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="invite.ics"');
    res.send(ics);
  }

  @Post(':id/cancel')
  @UseGuards(OriginCheckGuard)
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.cancelBooking(user.sub, id);
  }
}
