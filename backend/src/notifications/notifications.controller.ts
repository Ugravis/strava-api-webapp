import {
  Controller,
  Get,
  HttpCode,
  type MessageEvent,
  Post,
  Sse,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Observable } from 'rxjs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import { NotificationStreams } from './notification-streams';
import {
  NotificationsService,
  type NotificationsOverview,
} from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly streams: NotificationStreams,
  ) {}

  @Get()
  overview(@CurrentUser() user: User): Promise<NotificationsOverview> {
    return this.notifications.overview(user.id);
  }

  @Post('read')
  @HttpCode(204)
  markAllRead(@CurrentUser() user: User): Promise<void> {
    return this.notifications.markAllRead(user.id);
  }

  /** Server-sent events: the unread count and new notifications, as they happen. */
  @Sse('stream')
  @SkipThrottle()
  stream(@CurrentUser() user: User): Observable<MessageEvent> {
    return this.streams.open(user.id);
  }
}
