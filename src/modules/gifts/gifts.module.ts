import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GiftsService } from './gifts.service';
import { GiftsController } from './gifts.controller';
import { Gift, GiftSchema } from './schemas/gift.schema';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Gift.name, schema: GiftSchema }]),
    forwardRef(() => VendorsModule),
  ],
  controllers: [GiftsController],
  providers: [GiftsService],
  exports: [GiftsService],
})
export class GiftsModule {}
