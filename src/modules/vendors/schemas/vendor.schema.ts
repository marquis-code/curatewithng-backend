import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VendorDocument = Vendor & Document;

@Schema({ _id: false })
export class VendorLocation {
  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  city: string;

  @Prop()
  address?: string;
}

@Schema({ _id: false })
export class BankDetails {
  @Prop({ required: true })
  bankName: string;

  @Prop({ required: true })
  accountNumber: string; // Encrypted at rest

  @Prop({ required: true })
  accountName: string;
}

@Schema({ timestamps: true })
export class Vendor {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  businessName: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop()
  description: string;

  @Prop()
  logo: string;

  @Prop()
  coverImage: string;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ type: VendorLocation })
  location: VendorLocation;

  @Prop({ type: BankDetails })
  bankDetails: BankDetails;

  @Prop()
  paystackSubaccountCode: string;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ default: false })
  isApproved: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  approvedAt: Date;

  @Prop({ default: 0 })
  totalEarnings: number;

  @Prop({ default: 0 })
  pendingPayout: number;

  createdAt: Date;
  updatedAt: Date;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);

VendorSchema.index({ slug: 1 }, { unique: true });
VendorSchema.index({ userId: 1 }, { unique: true });
VendorSchema.index({ isApproved: 1, isActive: 1 });
VendorSchema.index({ categories: 1 });
VendorSchema.index({ 'location.state': 1 });
