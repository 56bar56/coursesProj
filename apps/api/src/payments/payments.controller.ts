import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OriginCheckGuard } from '../common/guards/origin-check.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FakeProviderOnlyGuard } from './guards/fake-provider-only.guard';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreateBookingCheckoutDto } from './dto/create-booking-checkout.dto';
import { SimulateOutcomeDto } from './dto/simulate-outcome.dto';
import { PAYMENT_PROVIDER, type PaymentProvider } from './providers/payment-provider.interface';
import type { AuthenticatedUser } from '../auth/types';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard, OriginCheckGuard)
  createCheckout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCheckoutDto) {
    return this.paymentsService.createCheckout(user.sub, dto.courseId);
  }

  @Post('booking-checkout')
  @UseGuards(JwtAuthGuard, OriginCheckGuard)
  createBookingCheckout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBookingCheckoutDto) {
    return this.paymentsService.createBookingCheckout(user.sub, dto.bookingId);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  listOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.listMine(user.sub);
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  getOrder(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.getOne(user.sub, id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers('x-fake-signature') signature?: string) {
    const event = this.provider.verifyAndParseWebhook(req.rawBody ?? Buffer.alloc(0), signature);
    await this.paymentsService.handleProviderEvent(event);
    return { received: true };
  }

  @Post('fake/:orderId/simulate')
  @UseGuards(JwtAuthGuard, OriginCheckGuard, FakeProviderOnlyGuard)
  @HttpCode(HttpStatus.OK)
  async simulate(
    @Param('orderId') orderId: string,
    @Body() dto: SimulateOutcomeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.paymentsService.simulate(user.sub, orderId, dto.outcome);
    return { success: true };
  }
}
