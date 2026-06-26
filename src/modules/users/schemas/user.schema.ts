import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../../../shared/types';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class BudgetRange {
  @Prop({ default: 5000 })
  min: number;

  @Prop({ default: 100000 })
  max: number;
}

@Schema({ _id: false })
export class UserPreferences {
  @Prop({ type: [String], default: [] })
  occasions: string[];

  @Prop({ type: BudgetRange, default: () => ({}) })
  budgetRange: BudgetRange;

  @Prop({ type: [String], default: [] })
  interests: string[];
}

@Schema({ _id: false })
export class Recipient {
  @Prop({ required: true })
  name: string;

  @Prop()
  relationship: string;

  @Prop()
  birthday: Date;

  @Prop({ type: [String], default: [] })
  interests: string[];

  @Prop()
  notes: string;
}

@Schema({ _id: false })
export class CorporateProfile {
  @Prop()
  companyName: string;

  @Prop()
  position: string;

  @Prop()
  teamSize: number;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop()
  passwordHash: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop()
  googleId: string;

  @Prop()
  phone: string;

  @Prop()
  avatar: string;

  @Prop({ type: UserPreferences, default: () => ({}) })
  preferences: UserPreferences;

  @Prop({ type: [Recipient], default: [] })
  recipients: Recipient[];

  @Prop({ type: [{ type: String, ref: 'Gift' }], default: [] })
  savedGifts: any[];

  @Prop({ type: CorporateProfile })
  corporateProfile: CorporateProfile;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ googleId: 1 }, { sparse: true });
