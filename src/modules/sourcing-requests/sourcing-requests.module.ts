import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SourcingRequestsController } from './sourcing-requests.controller';
import { SourcingRequestsService } from './sourcing-requests.service';
import { SourcingRequest, SourcingRequestSchema } from './schemas/sourcing-request.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SourcingRequest.name, schema: SourcingRequestSchema }]),
    NotificationsModule,
    SettingsModule,
  ],
  controllers: [SourcingRequestsController],
  providers: [SourcingRequestsService],
  exports: [SourcingRequestsService, MongooseModule]
})
export class SourcingRequestsModule {}
