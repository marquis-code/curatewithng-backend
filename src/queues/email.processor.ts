import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailChannel } from '../modules/notifications/channels/email.channel';

@Processor('email-queue')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private emailChannel: EmailChannel) {}

  @Process('send-email')
  async handleSendEmail(job: Job<{ to: string; subject: string; html: string }>) {
    this.logger.log(`Sending email to ${job.data.to}: ${job.data.subject}`);
    try {
      await this.emailChannel.send(job.data.to, job.data.subject, job.data.html);
    } catch (error) {
      this.logger.error(`Failed to send email to ${job.data.to}:`, error);
      throw error; // BullMQ will retry
    }
  }

  @Process('send-welcome')
  async handleSendWelcome(job: Job<{ to: string; name: string }>) {
    try {
      await this.emailChannel.sendWelcome(job.data.to, job.data.name);
    } catch (error) {
      this.logger.error(`Failed to send welcome email:`, error);
      throw error;
    }
  }

  @Process('send-order-confirmation')
  async handleOrderConfirmation(job: Job<{ to: string; name: string; orderNumber: string; totalAmount: number }>) {
    try {
      await this.emailChannel.sendOrderConfirmation(
        job.data.to,
        job.data.name,
        job.data.orderNumber,
        job.data.totalAmount,
      );
    } catch (error) {
      this.logger.error(`Failed to send order confirmation:`, error);
      throw error;
    }
  }

  @Process('send-vendor-approval')
  async handleVendorApproval(job: Job<{ to: string; businessName: string }>) {
    try {
      await this.emailChannel.sendVendorApproval(job.data.to, job.data.businessName);
    } catch (error) {
      this.logger.error(`Failed to send vendor approval:`, error);
      throw error;
    }
  }
}
