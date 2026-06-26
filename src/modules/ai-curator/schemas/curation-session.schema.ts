import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CurationSessionDocument = CurationSession & Document;

@Schema({ _id: false })
export class RecipientProfile {
  @Prop()
  name: string;

  @Prop()
  relationship: string;

  @Prop()
  age: number;

  @Prop()
  gender: string;

  @Prop({ type: [String], default: [] })
  interests: string[];

  @Prop()
  occasion: string;

  @Prop()
  budgetMin: number;

  @Prop()
  budgetMax: number;
}

@Schema({ _id: false })
export class Recommendation {
  @Prop({ type: Types.ObjectId, ref: 'Gift', required: false })
  giftId?: Types.ObjectId;

  @Prop({ default: false })
  isCustom: boolean;

  @Prop({ required: false })
  customName?: string;

  @Prop({ required: false })
  customDescription?: string;

  @Prop({ required: false })
  estimatedPrice?: number;

  @Prop()
  score: number;

  @Prop()
  reasoning: string;
}

@Schema({ timestamps: true })
export class CurationSession {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: RecipientProfile, required: true })
  recipientProfile: RecipientProfile;

  @Prop()
  aiPrompt: string;

  @Prop()
  aiResponse: string;

  @Prop({ type: [Recommendation], default: [] })
  recommendations: Recommendation[];

  @Prop({ default: false })
  isConverted: boolean;

  createdAt: Date;
}

export const CurationSessionSchema = SchemaFactory.createForClass(CurationSession);

CurationSessionSchema.index({ userId: 1 });
CurationSessionSchema.index({ createdAt: -1 });
CurationSessionSchema.index({ isConverted: 1 });
