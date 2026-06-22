import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiCuratorService } from './ai-curator.service';
import { AiCuratorController } from './ai-curator.controller';
import { CurationSession, CurationSessionSchema } from './schemas/curation-session.schema';
import { GiftsModule } from '../gifts/gifts.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CurationSession.name, schema: CurationSessionSchema },
    ]),
    GiftsModule,
  ],
  controllers: [AiCuratorController],
  providers: [AiCuratorService],
  exports: [AiCuratorService],
})
export class AiCuratorModule {}
