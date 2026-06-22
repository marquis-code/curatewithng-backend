import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailChannel, SmsChannel],
  exports: [NotificationsService, EmailChannel, SmsChannel],
})
export class NotificationsModule {}
