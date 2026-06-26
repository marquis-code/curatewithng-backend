import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { OrdersModule } from '../orders/orders.module';
import { VendorsModule } from '../vendors/vendors.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SourcingRequestsModule } from '../sourcing-requests/sourcing-requests.module';

import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    OrdersModule,
    VendorsModule,
    NotificationsModule,
    SourcingRequestsModule,
    BullModule.registerQueue({
      name: 'sourcing-queue',
    }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
