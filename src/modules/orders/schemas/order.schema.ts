import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderStatus, PaymentStatus } from '../../../shared/types';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Gift', required: true })
  giftId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true })
  vendorId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  subtotal: number;
}

@Schema({ _id: false })
export class OrderRecipient {
  @Prop({ required: true })
  name: string;

  @Prop()
  phone: string;

  @Prop()
  address: string;

  @Prop()
  note: string;

  @Prop()
  deliveryDate: Date;
}

@Schema({ _id: false })
export class TimelineEntry {
  @Prop({ type: String, enum: OrderStatus, required: true })
  status: OrderStatus;

  @Prop({ required: true, default: () => new Date() })
  timestamp: Date;

  @Prop()
  note: string;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItem], required: true })
  items: OrderItem[];

  @Prop({ type: OrderRecipient, required: true })
  recipient: OrderRecipient;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 0 })
  platformFee: number;

  @Prop({ default: 0 })
  vendorAmount: number;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.UNPAID })
  paymentStatus: PaymentStatus;

  @Prop()
  paystackReference: string;

  @Prop()
  paystackTransactionId: string;

  @Prop()
  curationSessionId: string;

  @Prop({ type: [TimelineEntry], default: [] })
  timeline: TimelineEntry[];

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ userId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ 'items.vendorId': 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ paystackReference: 1 }, { sparse: true });
