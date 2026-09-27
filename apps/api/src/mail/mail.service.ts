import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Env } from '../config/env.schema';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.from = this.config.get('SMTP_FROM', { infer: true });
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', { infer: true }),
      port: this.config.get('SMTP_PORT', { infer: true }),
      secure: false,
    });
  }

  async sendVerificationEmail(to: string, token: string) {
    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    const link = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send(to, 'Verify your email', `<p>Confirm your email address:</p><p><a href="${link}">${link}</a></p>`);
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    const link = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send(to, 'Reset your password', `<p>Reset your password:</p><p><a href="${link}">${link}</a></p>`);
  }

  async sendPurchaseReceiptEmail(to: string, courseTitle: string, amountCents: number, currency: string) {
    const amount = (amountCents / 100).toFixed(2);
    await this.send(
      to,
      'Your purchase receipt',
      `<p>Thanks for your purchase! You now have access to <strong>${courseTitle}</strong>.</p>` +
        `<p>Amount charged: ${amount} ${currency}</p>`,
    );
  }

  async sendBookingConfirmationEmail(to: string, mentorName: string, startAt: Date, joinUrl: string, icsContent: string) {
    await this.send(
      to,
      'Your consultation is confirmed',
      `<p>Your consultation with <strong>${mentorName}</strong> is confirmed for ${startAt.toISOString()}.</p>` +
        `<p><a href="${joinUrl}">${joinUrl}</a></p>`,
      [{ filename: 'invite.ics', content: icsContent, contentType: 'text/calendar; method=REQUEST' }],
    );
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    attachments?: { filename: string; content: string; contentType: string }[],
  ) {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html, attachments });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${(err as Error).message}`);
    }
  }
}
