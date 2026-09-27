import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { buildBookingIcs } from './ics-builder';
import { VIDEO_CALL_PROVIDER, type VideoCallProvider } from './providers/video-call-provider.interface';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    @Inject(VIDEO_CALL_PROVIDER) private readonly videoCallProvider: VideoCallProvider,
  ) {}

  async createBooking(studentId: string, slotId: string) {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.mentorAvailability.updateMany({
        where: { id: slotId, status: 'OPEN' },
        data: { status: 'BOOKED' },
      });
      if (claim.count === 0) {
        throw new ConflictException('Slot no longer available');
      }

      const slot = await tx.mentorAvailability.findUniqueOrThrow({ where: { id: slotId } });
      return tx.booking.create({
        data: {
          studentId,
          mentorId: slot.mentorId,
          slotId,
          scheduledStartAt: slot.startAt,
          scheduledEndAt: slot.endAt,
          amountCents: slot.priceCents,
          currency: slot.currency,
        },
      });
    });
  }

  async listMine(userId: string) {
    return this.prisma.booking.findMany({
      where: { studentId: userId },
      orderBy: { scheduledStartAt: 'desc' },
      include: { mentor: { select: { id: true, displayName: true } } },
    });
  }

  async getOne(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { mentor: { select: { id: true, displayName: true } } },
    });
    if (!booking || booking.studentId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  async getIcs(userId: string, bookingId: string): Promise<string> {
    const booking = await this.getBookingWithParties(userId, bookingId);
    if (booking.status !== 'CONFIRMED' || !booking.videoJoinUrl) {
      throw new NotFoundException('Booking is not confirmed yet');
    }

    return buildBookingIcs({
      bookingId: booking.id,
      startAt: booking.scheduledStartAt,
      endAt: booking.scheduledEndAt,
      mentorName: booking.mentor.displayName,
      mentorEmail: booking.mentor.email,
      studentEmail: booking.student.email,
      joinUrl: booking.videoJoinUrl,
    });
  }

  async cancelBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.studentId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status === 'CANCELLED') {
      return booking;
    }
    if (booking.scheduledStartAt <= new Date()) {
      throw new ForbiddenException('Cannot cancel a session that has already started');
    }

    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } }),
      this.prisma.mentorAvailability.update({ where: { id: booking.slotId }, data: { status: 'OPEN' } }),
    ]);
    return updatedBooking;
  }

  /** Called by PaymentsService once the booking's Order is confirmed PAID. */
  async confirmPaidBooking(bookingId: string): Promise<void> {
    const booking = await this.getBookingWithPartiesById(bookingId);
    if (booking.status !== 'PENDING_PAYMENT') {
      return; // already confirmed or cancelled — nothing to do
    }

    const meeting = await this.videoCallProvider.createMeeting({
      bookingId: booking.id,
      startAt: booking.scheduledStartAt,
      endAt: booking.scheduledEndAt,
      mentorEmail: booking.mentor.email,
      studentEmail: booking.student.email,
    });

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CONFIRMED', videoJoinUrl: meeting.joinUrl },
    });

    const ics = buildBookingIcs({
      bookingId: booking.id,
      startAt: booking.scheduledStartAt,
      endAt: booking.scheduledEndAt,
      mentorName: booking.mentor.displayName,
      mentorEmail: booking.mentor.email,
      studentEmail: booking.student.email,
      joinUrl: meeting.joinUrl,
    });

    await this.mailService.sendBookingConfirmationEmail(
      booking.student.email,
      booking.mentor.displayName,
      booking.scheduledStartAt,
      meeting.joinUrl,
      ics,
    );
  }

  /** Called by PaymentsService if the booking's Order fails/is cancelled. */
  async releaseFailedBooking(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.status !== 'PENDING_PAYMENT') {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } }),
      this.prisma.mentorAvailability.update({ where: { id: booking.slotId }, data: { status: 'OPEN' } }),
    ]);
  }

  private async getBookingWithParties(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { mentor: true, student: true },
    });
    if (!booking || booking.studentId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  private async getBookingWithPartiesById(bookingId: string) {
    return this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { mentor: true, student: true },
    });
  }
}
