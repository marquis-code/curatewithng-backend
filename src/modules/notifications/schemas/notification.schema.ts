import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Object })
  metadata: Record<string, unknown>;

  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ createdAt: -1 });
