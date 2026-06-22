import { Controller, Get, Patch, Param, Query, UseGuards, Post } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../shared/pagination/pagination.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  async findAll(@CurrentUser('sub') userId: string, @Query() query: PaginationDto) {
    return this.notificationsService.findByUser(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser('sub') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id);
    return { message: 'Marked as read' };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser('sub') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { message: 'All marked as read' };
  }
}
