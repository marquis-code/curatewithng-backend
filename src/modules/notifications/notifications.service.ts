import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { PaginationDto, createPaginatedResponse } from '../../shared/pagination/pagination.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }) {
    const notification = new this.notificationModel({
      userId: new Types.ObjectId(data.userId),
      type: data.type,
      title: data.title,
      body: data.body,
      metadata: data.metadata,
    });
    return notification.save();
  }

  async findByUser(userId: string, query: PaginationDto) {
    const { page, limit } = query;
    const filter = { userId: new Types.ObjectId(userId) };

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.notificationModel.countDocuments(filter),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async markAsRead(id: string): Promise<void> {
    await this.notificationModel.findByIdAndUpdate(id, { isRead: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
  }
}
