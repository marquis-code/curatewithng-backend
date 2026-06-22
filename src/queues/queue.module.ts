import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AiProcessor } from './ai.processor';
import { EmailProcessor } from './email.processor';
import { OrderProcessor } from './order.processor';
import { GiftsModule } from '../modules/gifts/gifts.module';
import { OrdersModule } from '../modules/orders/orders.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'ai-queue' },
      { name: 'email-queue' },
      { name: 'order-queue' },
    ),
    GiftsModule,
    OrdersModule,
    NotificationsModule,
  ],
  providers: [AiProcessor, EmailProcessor, OrderProcessor],
  exports: [BullModule],
})
export class QueueModule {}
