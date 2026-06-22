import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BudgetTier } from '../../../shared/types';

export type GiftDocument = Gift & Document;

@Schema({ timestamps: true })
export class Gift {
  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true })
  vendorId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ required: true })
  price: number; // In kobo (NGN)

  @Prop()
  discountPrice: number;

  @Prop({ default: 'NGN' })
  currency: string;

  @Prop({ type: [String], default: [] })
  occasions: string[];

  @Prop({ type: [String], default: [] })
  recipientTypes: string[];

  @Prop({ type: String, enum: BudgetTier, default: BudgetTier.MID })
  budgetTier: BudgetTier;

  @Prop({ default: 0 })
  stock: number;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ type: [String], default: [] })
  aiTags: string[];

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ default: false })
  isApproved: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const GiftSchema = SchemaFactory.createForClass(Gift);

GiftSchema.index({ slug: 1 }, { unique: true });
GiftSchema.index({ vendorId: 1 });
GiftSchema.index({ category: 1 });
GiftSchema.index({ occasions: 1 });
GiftSchema.index({ recipientTypes: 1 });
GiftSchema.index({ budgetTier: 1 });
GiftSchema.index({ price: 1 });
GiftSchema.index({ isApproved: 1, isAvailable: 1, isDeleted: 1 });
GiftSchema.index({ isFeatured: 1 });
GiftSchema.index({ tags: 1 });
GiftSchema.index({ aiTags: 1 });
GiftSchema.index({ name: 'text', description: 'text', tags: 'text' });
