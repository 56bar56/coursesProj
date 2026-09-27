import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { BookingsService } from '../bookings/bookings.service';
import { PAYMENT_PROVIDER, type NormalizedPaymentEvent, type PaymentProvider } from './providers/payment-provider.interface';
import type { Env } from '../config/env.schema';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly mailService: MailService,
    private readonly bookingsService: BookingsService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async createCheckout(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.status !== 'PUBLISHED') {
      throw new NotFoundException('Course not found');
    }
    if (course.priceCents === 0) {
      throw new BadRequestException('This course is free; use free enrollment instead');
    }

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existingEnrollment) {
      throw new BadRequestException('Already enrolled in this course');
    }

    const providerName = this.config.get('PAYMENT_PROVIDER', { infer: true });
    const order = await this.prisma.order.create({
      data: {
        userId,
        courseId,
        amountCents: course.priceCents,
        currency: course.currency,
        status: 'PENDING',
        provider: providerName,
      },
    });

    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    const { checkoutUrl, providerRef } = await this.provider.createCheckoutSession({
      orderId: order.id,
      amountCents: order.amountCents,
      currency: order.currency,
      successUrl: `${frontendUrl}/orders`,
      cancelUrl: `${frontendUrl}/courses/${course.slug}`,
    });

    await this.prisma.order.update({ where: { id: order.id }, data: { providerRef } });

    return { checkoutUrl, orderId: order.id };
  }

  async createBookingCheckout(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.studentId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('This booking is not awaiting payment');
    }

    const providerName = this.config.get('PAYMENT_PROVIDER', { infer: true });
    const order = await this.prisma.order.create({
      data: {
        userId,
        bookingId,
        amountCents: booking.amountCents,
        currency: booking.currency,
        status: 'PENDING',
        provider: providerName,
      },
    });

    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    const { checkoutUrl, providerRef } = await this.provider.createCheckoutSession({
      orderId: order.id,
      amountCents: order.amountCents,
      currency: order.currency,
      successUrl: `${frontendUrl}/bookings`,
      cancelUrl: `${frontendUrl}/mentors`,
    });

    await this.prisma.order.update({ where: { id: order.id }, data: { providerRef } });

    return { checkoutUrl, orderId: order.id };
  }

  private readonly orderIncludes = {
    course: { select: { id: true, slug: true, title: true } },
    booking: { include: { mentor: { select: { id: true, displayName: true } } } },
  } as const;

  async listMine(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: this.orderIncludes,
    });
  }

  async getOne(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderIncludes,
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  /**
   * Idempotent: uses an atomic conditional update so two concurrent calls
   * (a duplicated webhook delivery, a double-clicked Simulate button) can
   * only ever result in one Enrollment upsert and one receipt email.
   */
  async handleProviderEvent(event: NormalizedPaymentEvent): Promise<void> {
    const newStatus = event.type === 'checkout.completed' ? 'PAID' : 'FAILED';

    const result = await this.prisma.order.updateMany({
      where: { id: event.orderId, status: 'PENDING' },
      data: { status: newStatus },
    });
    if (result.count === 0) {
      return; // already handled by a concurrent or duplicate call
    }

    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: event.orderId } });

    if (order.bookingId) {
      if (newStatus === 'PAID') {
        await this.bookingsService.confirmPaidBooking(order.bookingId);
      } else {
        await this.bookingsService.releaseFailedBooking(order.bookingId);
      }
      return;
    }

    if (newStatus !== 'PAID' || !order.courseId) {
      return;
    }

    await this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
      create: { userId: order.userId, courseId: order.courseId, purchaseId: order.id },
      update: { purchaseId: order.id },
    });

    const [user, course] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: order.userId } }),
      this.prisma.course.findUnique({ where: { id: order.courseId } }),
    ]);
    if (user && course) {
      await this.mailService.sendPurchaseReceiptEmail(user.email, course.title, order.amountCents, order.currency);
    }
  }

  async simulate(userId: string, orderId: string, outcome: 'success' | 'failure'): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    if (order.provider !== 'fake') {
      throw new ForbiddenException('This order is not using the fake payment provider');
    }
    if (order.status !== 'PENDING') {
      throw new ConflictException('This order has already been finalized');
    }

    await this.handleProviderEvent({
      type: outcome === 'success' ? 'checkout.completed' : 'checkout.failed',
      orderId: order.id,
      providerRef: order.providerRef ?? '',
    });
  }
}
