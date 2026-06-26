import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SourcingRequestDocument = SourcingRequest & Document;

export enum BudgetFlexibility {
  STRICT = 'STRICT',
  FLEXIBLE = 'FLEXIBLE',
  VERY_FLEXIBLE = 'VERY_FLEXIBLE',
}

export enum SourcingStatus {
  PENDING = 'PENDING',
  QUOTED = 'QUOTED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  SOURCING = 'SOURCING',
  FULFILLED = 'FULFILLED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

@Schema({ _id: false })
export class RecipientProfileSubset {
  @Prop()
  name?: string;

  @Prop()
  relationship?: string;

  @Prop()
  age?: number;

  @Prop()
  gender?: string;

  @Prop({ type: [String], default: [] })
  interests: string[];
}

@Schema({ _id: false })
export class BudgetSignal {
  @Prop({ required: true })
  ideal: number;

  @Prop({ type: String, enum: BudgetFlexibility, default: BudgetFlexibility.FLEXIBLE })
  flexibility: BudgetFlexibility;
}

@Schema({ _id: false })
export class QuoteObject {
  @Prop()
  amount: number;

  @Prop()
  sourcingFee: number;

  @Prop()
  total: number;

  @Prop()
  breakdown?: string;

  @Prop()
  sentAt?: Date;

  @Prop()
  expiresAt?: Date;
}

@Schema({ timestamps: true })
export class SourcingRequest {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  giftIdea: string;

  @Prop()
  occasion: string;

  @Prop({ type: RecipientProfileSubset })
  recipientProfile: RecipientProfileSubset;

  @Prop({ type: BudgetSignal, required: true })
  budgetSignal: BudgetSignal;

  @Prop({ required: true })
  timeline: string;

  @Prop({ required: true })
  contactName: string;

  @Prop({ required: true })
  contactEmail: string;

  @Prop({ required: true })
  contactPhone: string;

  @Prop()
  additionalNotes?: string;

  @Prop({ type: String, enum: SourcingStatus, default: SourcingStatus.PENDING })
  status: SourcingStatus;

  // Escrow / Payment fields
  @Prop({ type: QuoteObject })
  quote?: QuoteObject;

  @Prop()
  quoteAcceptedAt?: Date;

  @Prop()
  paymentReference?: string;

  @Prop()
  paymentReceivedAt?: Date;

  @Prop({ default: false })
  isAboveUserBudget?: boolean;

  @Prop({ default: false })
  userConsentForBudgetExceed?: boolean;

  // Admin Sourcing Fields
  @Prop()
  conciergeNote?: string;

  @Prop({ type: Types.ObjectId, ref: 'Vendor' })
  vendorMatch?: Types.ObjectId;

  // Trending Aggregation
  @Prop({ default: 1 })
  requestCount: number;

  @Prop({ default: false })
  isTrending: boolean;
}

export const SourcingRequestSchema = SchemaFactory.createForClass(SourcingRequest);

SourcingRequestSchema.index({ status: 1 });
SourcingRequestSchema.index({ userId: 1 });
SourcingRequestSchema.index({ giftIdea: 1 });
SourcingRequestSchema.index({ isTrending: 1 });
