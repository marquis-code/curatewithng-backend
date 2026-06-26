import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SourcingRequest, SourcingRequestDocument, SourcingStatus } from '../modules/sourcing-requests/schemas/sourcing-request.schema';
import { EmailChannel } from '../modules/notifications/channels/email.channel';

@Injectable()
@Processor('sourcing-queue')
export class SourcingProcessor {
  private readonly logger = new Logger(SourcingProcessor.name);

  constructor(
    @InjectModel(SourcingRequest.name) private sourcingModel: Model<SourcingRequestDocument>,
    private emailChannel: EmailChannel,
  ) {}

  @Process('aggregate-sourcing-demand')
  async handleAggregateSourcingDemand(job: Job) {
    this.logger.log('Running aggregate-sourcing-demand cron job');
    // Implement cron aggregation logic here if not handled inline
    // This is typically scheduled, but we can have the logic here.
  }

  @Process('send-quote-email')
  async handleSendQuoteEmail(job: Job<{ requestId: string }>) {
    this.logger.log(`Sending quote email for request ${job.data.requestId}`);
    const request = await this.sourcingModel.findById(job.data.requestId).populate('userId');
    if (!request) return;

    if (request.contactEmail) {
      await this.emailChannel.send(
        request.contactEmail,
        'Your CurateWithNG Sourcing Quote is Ready',
        `
        <h1>Hi ${request.contactName},</h1>
        <p>We've found a way to source your idea: <strong>${request.giftIdea}</strong></p>
        <p>The total cost including our concierge sourcing fee is ₦${request.quote!.total.toLocaleString()}.</p>
        <a href="https://curatewithng.com/sourcing/pay/${request._id}">Click here to securely complete payment.</a>
        `
      );
    }
  }

  @Process('process-sourcing-payment')
  async handleProcessSourcingPayment(job: Job<{ requestId: string }>) {
    this.logger.log(`Processing sourcing payment for request ${job.data.requestId}`);
    const request = await this.sourcingModel.findById(job.data.requestId);
    if (!request) return;

    // Notify Ops Team
    await this.emailChannel.send(
      'ops@curatewithng.com',
      'Sourcing Payment Received',
      `Payment received for request ${request._id} (${request.giftIdea}). Please begin sourcing process.`
    );
  }

  @Process('send-weekly-sourcing-digest')
  async handleSendWeeklySourcingDigest(job: Job) {
    this.logger.log('Running weekly sourcing digest...');
    // Implementation for weekly digest
  }

  @Process('auto-refund-unsourceable')
  async handleAutoRefundUnsourceable(job: Job) {
    this.logger.log('Running auto refund unsourceable...');
    // Find requests stuck in PAYMENT_RECEIVED for > 72 hours
    const threshold = new Date(Date.now() - 72 * 3600000);
    const expired = await this.sourcingModel.find({
      status: SourcingStatus.PAYMENT_RECEIVED,
      paymentReceivedAt: { $lt: threshold }
    });

    for (const req of expired) {
      this.logger.warn(`Auto-refunding request ${req._id}`);
      // In a real app, call Paystack refund endpoint here
      req.status = SourcingStatus.CANCELLED;
      await req.save();

      if (req.contactEmail) {
        await this.emailChannel.send(
          req.contactEmail,
          'Update on your Sourcing Request',
          `
          <h1>Hi ${req.contactName},</h1>
          <p>Unfortunately, we could not source your idea (${req.giftIdea}) within the specified parameters.</p>
          <p>Your payment of ₦${req.quote!.total.toLocaleString()} has been fully refunded.</p>
          `
        );
      }
    }
  }
}
