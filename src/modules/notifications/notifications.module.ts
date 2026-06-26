import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { NotificationsGateway } from './notifications.gateway';

import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    JwtModule.register({}), // Using JwtService to decode token
    UsersModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailChannel, SmsChannel, NotificationsGateway],
  exports: [NotificationsService, EmailChannel, SmsChannel, NotificationsGateway],
})
export class NotificationsModule {}
