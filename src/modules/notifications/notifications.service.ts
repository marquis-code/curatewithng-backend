import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { PaginationDto, createPaginatedResponse } from '../../shared/pagination/pagination.dto';
import { NotificationsGateway } from './notifications.gateway';
import { EmailChannel } from './channels/email.channel';
import { UsersService } from '../users/users.service';
import { UserRole } from '../../shared/types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private readonly gateway: NotificationsGateway,
    private readonly emailChannel: EmailChannel,
    private readonly usersService: UsersService,
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
    const saved = await notification.save();
    
    // Emit real-time update
    this.gateway.emitToUser(data.userId, 'new_notification', saved);
    
    // Check if user is online, if not, send fallback email
    try {
      const isOnline = await this.gateway.isUserOnline(data.userId);
      if (!isOnline) {
        const user = await this.usersService.findById(data.userId);
        if (user && user.email) {
          // In a real app, map Notification `type` to specific rich email templates.
          // For now, we'll send a generic notification email if no specific template is used here,
          // or rely on the specific templates already in EmailChannel (like order confirmation).
          const htmlContent = `
            <h3>${data.title}</h3>
            <p>${data.body}</p>
            <p><a href="https://curatewithng.com/dashboard/notifications" style="display:inline-block;padding:10px 20px;background:#6B21A8;color:#fff;text-decoration:none;border-radius:5px;">View Notification</a></p>
          `;
          await this.emailChannel.send(user.email, data.title, htmlContent);
          this.logger.log(`Fallback email sent to offline user ${data.userId} for notification: ${data.title}`);
        }
      }
    } catch (err) {
      this.logger.error(`Error sending fallback email for notification: ${err}`);
    }
    
    return saved;
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

  async notifyAdmins(data: { type: string; title: string; body: string; metadata?: Record<string, unknown> }) {
    const adminUsersResult = await this.usersService.findAll({ page: 1, limit: 100, role: UserRole.ADMIN });
    const admins = adminUsersResult.data;

    const promises = admins.map(admin =>
      this.create({
        userId: admin._id.toString(),
        type: data.type,
        title: data.title,
        body: data.body,
        metadata: data.metadata,
      })
    );
    await Promise.allSettled(promises);
  }
}
