import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AiProcessor } from './ai.processor';
import { EmailProcessor } from './email.processor';
import { OrderProcessor } from './order.processor';
import { SourcingProcessor } from './sourcing.processor';
import { GiftsModule } from '../modules/gifts/gifts.module';
import { OrdersModule } from '../modules/orders/orders.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { SourcingRequestsModule } from '../modules/sourcing-requests/sourcing-requests.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'ai-queue' },
      { name: 'email-queue' },
      { name: 'order-queue' },
      { name: 'sourcing-queue' },
    ),
    GiftsModule,
    OrdersModule,
    NotificationsModule,
    SourcingRequestsModule,
  ],
  providers: [AiProcessor, EmailProcessor, OrderProcessor, SourcingProcessor],
  exports: [BullModule],
})
export class QueueModule implements OnModuleInit {
  constructor(
    @InjectQueue('sourcing-queue') private readonly sourcingQueue: Queue,
  ) {}

  async onModuleInit() {
    // Schedule recurring jobs for the sourcing processor
    await this.sourcingQueue.add('aggregate-sourcing-demand', {}, { repeat: { cron: '0 * * * *' } }); // Hourly
    await this.sourcingQueue.add('auto-refund-unsourceable', {}, { repeat: { cron: '0 * * * *' } }); // Hourly
    await this.sourcingQueue.add('send-weekly-sourcing-digest', {}, { repeat: { cron: '0 0 * * 1' } }); // Weekly on Monday
  }
}
