import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MentorsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMentors() {
    return this.prisma.user.findMany({
      where: { roles: { has: 'MENTOR' } },
      select: { id: true, displayName: true },
    });
  }

  async listAvailability(mentorId: string, from?: string, to?: string) {
    return this.prisma.mentorAvailability.findMany({
      where: {
        mentorId,
        status: 'OPEN',
        ...(from ? { startAt: { gte: new Date(from) } } : {}),
        ...(to ? { startAt: { lte: new Date(to) } } : {}),
      },
      orderBy: { startAt: 'asc' },
      select: { id: true, startAt: true, endAt: true, priceCents: true, currency: true },
    });
  }

  async listMyAvailability(mentorId: string) {
    return this.prisma.mentorAvailability.findMany({
      where: { mentorId },
      orderBy: { startAt: 'asc' },
    });
  }

  async listMyBookings(mentorId: string) {
    return this.prisma.booking.findMany({
      where: { mentorId },
      orderBy: { scheduledStartAt: 'asc' },
      include: { student: { select: { id: true, displayName: true } } },
    });
  }
}
