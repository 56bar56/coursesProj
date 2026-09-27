import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  const openSlot = {
    id: 'slot-1',
    mentorId: 'mentor-1',
    startAt: new Date(Date.now() + 60 * 60 * 1000),
    endAt: new Date(Date.now() + 90 * 60 * 1000),
    priceCents: 8000,
    currency: 'USD',
    status: 'OPEN',
  };

  const pendingBooking = {
    id: 'booking-1',
    studentId: 'user-1',
    mentorId: 'mentor-1',
    slotId: 'slot-1',
    scheduledStartAt: openSlot.startAt,
    scheduledEndAt: openSlot.endAt,
    amountCents: 8000,
    currency: 'USD',
    status: 'PENDING_PAYMENT',
    videoJoinUrl: null,
  };

  function buildService(overrides?: { booking?: any }) {
    const prisma: any = {
      mentorAvailability: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(openSlot),
        update: jest.fn().mockResolvedValue({ ...openSlot, status: 'OPEN' }),
      },
      booking: {
        create: jest.fn().mockResolvedValue(pendingBooking),
        findUnique: jest.fn().mockResolvedValue(overrides?.booking === undefined ? pendingBooking : overrides.booking),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...pendingBooking,
          mentor: { id: 'mentor-1', displayName: 'Mentor One', email: 'mentor@example.com' },
          student: { id: 'user-1', displayName: 'Student One', email: 'student@example.com' },
        }),
        update: jest.fn().mockResolvedValue({ ...pendingBooking, status: 'CONFIRMED' }),
      },
    };
    prisma.$transaction = jest.fn((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });

    const mailService = { sendBookingConfirmationEmail: jest.fn().mockResolvedValue(undefined) };
    const videoCallProvider = {
      createMeeting: jest.fn().mockResolvedValue({ joinUrl: 'http://x/call/1', providerMeetingId: 'stub_1' }),
    };

    const service = new BookingsService(prisma, mailService as any, videoCallProvider as any);
    return { service, prisma, mailService, videoCallProvider };
  }

  describe('createBooking', () => {
    it('claims the slot and creates a booking when the slot is open', async () => {
      const { service, prisma } = buildService();
      const result = await service.createBooking('user-1', 'slot-1');

      expect(prisma.mentorAvailability.updateMany).toHaveBeenCalledWith({
        where: { id: 'slot-1', status: 'OPEN' },
        data: { status: 'BOOKED' },
      });
      expect(result).toEqual(pendingBooking);
    });

    it('rejects with ConflictException when the slot was already claimed', async () => {
      const { service, prisma } = buildService();
      prisma.mentorAvailability.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.createBooking('user-1', 'slot-1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('is safe under a concurrent double-booking race: only one claim succeeds', async () => {
      const { service, prisma } = buildService();
      prisma.mentorAvailability.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      const results = await Promise.allSettled([
        service.createBooking('user-1', 'slot-1'),
        service.createBooking('user-2', 'slot-1'),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(prisma.booking.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancelBooking', () => {
    it('cancels a future booking and frees the slot', async () => {
      const { service, prisma } = buildService();
      await service.cancelBooking('user-1', 'booking-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('rejects cancellation once the session has already started', async () => {
      const { service } = buildService({
        booking: { ...pendingBooking, scheduledStartAt: new Date(Date.now() - 60_000) },
      });
      await expect(service.cancelBooking('user-1', 'booking-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when the booking does not belong to the caller', async () => {
      const { service } = buildService({ booking: { ...pendingBooking, studentId: 'someone-else' } });
      await expect(service.cancelBooking('user-1', 'booking-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('is a no-op when already cancelled', async () => {
      const { service, prisma } = buildService({ booking: { ...pendingBooking, status: 'CANCELLED' } });
      await service.cancelBooking('user-1', 'booking-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('confirmPaidBooking', () => {
    it('creates a video meeting, confirms the booking, and sends a confirmation email', async () => {
      const { service, prisma, mailService, videoCallProvider } = buildService();
      await service.confirmPaidBooking('booking-1');

      expect(videoCallProvider.createMeeting).toHaveBeenCalledWith(
        expect.objectContaining({ bookingId: 'booking-1' }),
      );
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { status: 'CONFIRMED', videoJoinUrl: 'http://x/call/1' },
      });
      expect(mailService.sendBookingConfirmationEmail).toHaveBeenCalledTimes(1);
    });

    it('does nothing if the booking is no longer PENDING_PAYMENT', async () => {
      const { service, prisma, videoCallProvider } = buildService();
      prisma.booking.findUniqueOrThrow.mockResolvedValue({
        ...pendingBooking,
        status: 'CANCELLED',
        mentor: { id: 'mentor-1', displayName: 'Mentor One', email: 'mentor@example.com' },
        student: { id: 'user-1', displayName: 'Student One', email: 'student@example.com' },
      });

      await service.confirmPaidBooking('booking-1');
      expect(videoCallProvider.createMeeting).not.toHaveBeenCalled();
    });
  });

  describe('getOne', () => {
    it('throws NotFoundException for another user\'s booking', async () => {
      const { service, prisma } = buildService();
      prisma.booking.findUnique.mockResolvedValue({ ...pendingBooking, studentId: 'someone-else' });
      await expect(service.getOne('user-1', 'booking-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getIcs', () => {
    it('throws NotFoundException when the booking is not confirmed yet', async () => {
      const { service, prisma } = buildService();
      prisma.booking.findUnique.mockResolvedValue({
        ...pendingBooking,
        mentor: { id: 'mentor-1', displayName: 'Mentor One', email: 'mentor@example.com' },
        student: { id: 'user-1', displayName: 'Student One', email: 'student@example.com' },
      });
      await expect(service.getIcs('user-1', 'booking-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns ICS content for a confirmed booking', async () => {
      const { service, prisma } = buildService();
      prisma.booking.findUnique.mockResolvedValue({
        ...pendingBooking,
        status: 'CONFIRMED',
        videoJoinUrl: 'http://x/call/1',
        mentor: { id: 'mentor-1', displayName: 'Mentor One', email: 'mentor@example.com' },
        student: { id: 'user-1', displayName: 'Student One', email: 'student@example.com' },
      });
      const ics = await service.getIcs('user-1', 'booking-1');
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('http://x/call/1');
    });
  });

  describe('releaseFailedBooking', () => {
    it('cancels the booking and frees the slot', async () => {
      const { service, prisma } = buildService();
      await service.releaseFailedBooking('booking-1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('does nothing if the booking is not PENDING_PAYMENT', async () => {
      const { service, prisma } = buildService({ booking: { ...pendingBooking, status: 'CONFIRMED' } });
      await service.releaseFailedBooking('booking-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
