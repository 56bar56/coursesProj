import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const publishedPaidCourse = {
    id: 'course-1',
    slug: 'paid-course',
    status: 'PUBLISHED',
    priceCents: 5000,
    currency: 'USD',
  };

  function buildService(overrides?: { course?: any; existingEnrollment?: any; booking?: any }) {
    const prisma = {
      course: {
        findUnique: jest.fn().mockResolvedValue(
          overrides?.course === undefined ? publishedPaidCourse : overrides.course,
        ),
      },
      booking: {
        findUnique: jest.fn().mockResolvedValue(
          overrides?.booking === undefined
            ? { id: 'booking-1', studentId: 'user-1', status: 'PENDING_PAYMENT', amountCents: 8000, currency: 'USD' }
            : overrides.booking,
        ),
      },
      enrollment: {
        findUnique: jest.fn().mockResolvedValue(overrides?.existingEnrollment ?? null),
        upsert: jest.fn().mockResolvedValue({ id: 'enrollment-1' }),
      },
      order: {
        create: jest.fn().mockResolvedValue({
          id: 'order-1',
          userId: 'user-1',
          courseId: 'course-1',
          amountCents: 5000,
          currency: 'USD',
          status: 'PENDING',
          provider: 'fake',
          providerRef: null,
        }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'order-1',
          userId: 'user-1',
          courseId: 'course-1',
          amountCents: 5000,
          currency: 'USD',
          status: 'PAID',
          provider: 'fake',
          providerRef: 'fake_order-1',
        }),
        findUnique: jest.fn(),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', email: 'student@example.com' }) },
    };

    const config = {
      get: jest.fn((key: string) => {
        if (key === 'PAYMENT_PROVIDER') return 'fake';
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        throw new Error(`Unexpected config key in test: ${key}`);
      }),
    };

    const mailService = { sendPurchaseReceiptEmail: jest.fn().mockResolvedValue(undefined) };
    const bookingsService = {
      confirmPaidBooking: jest.fn().mockResolvedValue(undefined),
      releaseFailedBooking: jest.fn().mockResolvedValue(undefined),
    };
    const provider = {
      createCheckoutSession: jest.fn().mockResolvedValue({ checkoutUrl: 'http://x/checkout', providerRef: 'fake_order-1' }),
      verifyAndParseWebhook: jest.fn(),
    };

    const service = new PaymentsService(
      prisma as any,
      config as any,
      mailService as any,
      bookingsService as any,
      provider as any,
    );
    return { service, prisma, mailService, bookingsService, provider };
  }

  describe('createCheckout', () => {
    it('rejects when the course does not exist', async () => {
      const { service } = buildService({ course: null });
      await expect(service.createCheckout('user-1', 'course-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when the course is not published', async () => {
      const { service } = buildService({ course: { ...publishedPaidCourse, status: 'DRAFT' } });
      await expect(service.createCheckout('user-1', 'course-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when the course is free', async () => {
      const { service } = buildService({ course: { ...publishedPaidCourse, priceCents: 0 } });
      await expect(service.createCheckout('user-1', 'course-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the user is already enrolled', async () => {
      const { service } = buildService({ existingEnrollment: { id: 'enrollment-1' } });
      await expect(service.createCheckout('user-1', 'course-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a PENDING order with the price snapshotted from the course', async () => {
      const { service, prisma, provider } = buildService();
      const result = await service.createCheckout('user-1', 'course-1');

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amountCents: 5000, currency: 'USD', status: 'PENDING', provider: 'fake' }),
        }),
      );
      expect(provider.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-1', amountCents: 5000, currency: 'USD' }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { providerRef: 'fake_order-1' },
      });
      expect(result).toEqual({ checkoutUrl: 'http://x/checkout', orderId: 'order-1' });
    });
  });

  describe('createBookingCheckout', () => {
    it('rejects when the booking does not belong to the caller', async () => {
      const { service } = buildService({ booking: { id: 'booking-1', studentId: 'someone-else', status: 'PENDING_PAYMENT' } });
      await expect(service.createBookingCheckout('user-1', 'booking-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when the booking is not awaiting payment', async () => {
      const { service } = buildService({ booking: { id: 'booking-1', studentId: 'user-1', status: 'CONFIRMED' } });
      await expect(service.createBookingCheckout('user-1', 'booking-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a PENDING order with bookingId set and the price snapshotted from the booking', async () => {
      const { service, prisma, provider } = buildService();
      prisma.order.create.mockResolvedValueOnce({
        id: 'order-2',
        userId: 'user-1',
        bookingId: 'booking-1',
        amountCents: 8000,
        currency: 'USD',
        status: 'PENDING',
        provider: 'fake',
        providerRef: null,
      });

      const result = await service.createBookingCheckout('user-1', 'booking-1');

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bookingId: 'booking-1', amountCents: 8000, currency: 'USD', status: 'PENDING' }),
        }),
      );
      expect(provider.createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'order-2' }));
      expect(result).toEqual({ checkoutUrl: 'http://x/checkout', orderId: 'order-2' });
    });
  });

  describe('handleProviderEvent', () => {
    it('flips the order to PAID and creates an enrollment on checkout.completed', async () => {
      const { service, prisma, mailService } = buildService();
      await service.handleProviderEvent({ type: 'checkout.completed', orderId: 'order-1', providerRef: 'fake_order-1' });

      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', status: 'PENDING' },
        data: { status: 'PAID' },
      });
      expect(prisma.enrollment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_courseId: { userId: 'user-1', courseId: 'course-1' } },
        }),
      );
      expect(mailService.sendPurchaseReceiptEmail).toHaveBeenCalledTimes(1);
    });

    it('is idempotent under two concurrent calls: enrollment and email each fire exactly once', async () => {
      const { service, prisma, mailService } = buildService();
      // Simulate the atomic guard: only the first concurrent updateMany actually flips PENDING -> PAID.
      prisma.order.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      await Promise.all([
        service.handleProviderEvent({ type: 'checkout.completed', orderId: 'order-1', providerRef: 'fake_order-1' }),
        service.handleProviderEvent({ type: 'checkout.completed', orderId: 'order-1', providerRef: 'fake_order-1' }),
      ]);

      expect(prisma.enrollment.upsert).toHaveBeenCalledTimes(1);
      expect(mailService.sendPurchaseReceiptEmail).toHaveBeenCalledTimes(1);
    });

    it('no-ops cleanly when the order is already terminal', async () => {
      const { service, prisma, mailService } = buildService();
      prisma.order.updateMany.mockResolvedValue({ count: 0 });

      await service.handleProviderEvent({ type: 'checkout.completed', orderId: 'order-1', providerRef: 'fake_order-1' });

      expect(prisma.enrollment.upsert).not.toHaveBeenCalled();
      expect(mailService.sendPurchaseReceiptEmail).not.toHaveBeenCalled();
    });

    it('sets FAILED and creates no enrollment on checkout.failed', async () => {
      const { service, prisma, mailService } = buildService();
      await service.handleProviderEvent({ type: 'checkout.failed', orderId: 'order-1', providerRef: 'fake_order-1' });

      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      expect(prisma.enrollment.upsert).not.toHaveBeenCalled();
      expect(mailService.sendPurchaseReceiptEmail).not.toHaveBeenCalled();
    });

    it('delegates to BookingsService.confirmPaidBooking for a booking order, without touching Enrollment', async () => {
      const { service, prisma, bookingsService, mailService } = buildService();
      prisma.order.findUniqueOrThrow.mockResolvedValue({
        id: 'order-2',
        userId: 'user-1',
        courseId: null,
        bookingId: 'booking-1',
        amountCents: 8000,
        currency: 'USD',
        status: 'PAID',
        provider: 'fake',
      });

      await service.handleProviderEvent({ type: 'checkout.completed', orderId: 'order-2', providerRef: 'fake_order-2' });

      expect(bookingsService.confirmPaidBooking).toHaveBeenCalledWith('booking-1');
      expect(bookingsService.releaseFailedBooking).not.toHaveBeenCalled();
      expect(prisma.enrollment.upsert).not.toHaveBeenCalled();
      expect(mailService.sendPurchaseReceiptEmail).not.toHaveBeenCalled();
    });

    it('delegates to BookingsService.releaseFailedBooking for a failed booking order', async () => {
      const { service, prisma, bookingsService } = buildService();
      prisma.order.findUniqueOrThrow.mockResolvedValue({
        id: 'order-2',
        userId: 'user-1',
        courseId: null,
        bookingId: 'booking-1',
        amountCents: 8000,
        currency: 'USD',
        status: 'FAILED',
        provider: 'fake',
      });

      await service.handleProviderEvent({ type: 'checkout.failed', orderId: 'order-2', providerRef: 'fake_order-2' });

      expect(bookingsService.releaseFailedBooking).toHaveBeenCalledWith('booking-1');
      expect(bookingsService.confirmPaidBooking).not.toHaveBeenCalled();
    });
  });

  describe('simulate', () => {
    it('rejects when the order does not belong to the caller', async () => {
      const { service, prisma } = buildService();
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', userId: 'someone-else', provider: 'fake', status: 'PENDING' });
      await expect(service.simulate('user-1', 'order-1', 'success')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when the order is not using the fake provider', async () => {
      const { service, prisma } = buildService();
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', userId: 'user-1', provider: 'stripe', status: 'PENDING' });
      await expect(service.simulate('user-1', 'order-1', 'success')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when the order is already finalized', async () => {
      const { service, prisma } = buildService();
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', userId: 'user-1', provider: 'fake', status: 'PAID' });
      await expect(service.simulate('user-1', 'order-1', 'success')).rejects.toBeInstanceOf(ConflictException);
    });

    it('drives the same handleProviderEvent path on a valid simulate call', async () => {
      const { service, prisma } = buildService();
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        provider: 'fake',
        status: 'PENDING',
        providerRef: 'fake_order-1',
      });

      await service.simulate('user-1', 'order-1', 'success');

      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', status: 'PENDING' },
        data: { status: 'PAID' },
      });
    });
  });
});
