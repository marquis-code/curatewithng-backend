import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlatformSettingsDocument = PlatformSettings & Document;

@Schema({ _id: false })
export class SourcingFeeTier {
  @Prop({ required: true })
  minAmount: number;

  @Prop()
  maxAmount?: number;

  @Prop({ required: true })
  percentage: number;
}

@Schema({ timestamps: true })
export class PlatformSettings {
  @Prop({ default: 'default', unique: true })
  key: string;

  @Prop({ type: [SourcingFeeTier], default: [] })
  sourcingFeeTiers: SourcingFeeTier[];
}

export const PlatformSettingsSchema = SchemaFactory.createForClass(PlatformSettings);
