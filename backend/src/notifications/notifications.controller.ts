import {
  Body,
  Controller,
  Get,
  HttpCode,
  type MessageEvent,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Observable } from 'rxjs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import { NotificationStreams } from './notification-streams';
import { MarkReadDto, NotificationsPageQueryDto } from './notifications.dto';
import {
  NotificationsService,
  type NotificationsPage,
} from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly streams: NotificationStreams,
  ) {}

  @Get()
  page(
    @CurrentUser() user: User,
    @Query() { category, offset }: NotificationsPageQueryDto,
  ): Promise<NotificationsPage> {
    return this.notifications.page(user.id, category, offset);
  }

  @Post('read')
  @HttpCode(204)
  markRead(
    @CurrentUser() user: User,
    @Body() { ids }: MarkReadDto,
  ): Promise<void> {
    return this.notifications.markRead(user.id, ids);
  }

  /** Server-sent events: the unread count and new notifications, as they happen. */
  @Sse('stream')
  @SkipThrottle()
  stream(@CurrentUser() user: User): Observable<MessageEvent> {
    return this.streams.open(user.id);
  }
}
