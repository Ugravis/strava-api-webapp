import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { type PublicUser, toPublicUser } from '../users/dto/public-user';
import { User } from '../users/user.entity';
import { NotificationStreams } from './notification-streams';
import { Notification, type NotificationType } from './notification.entity';

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  actor: PublicUser;
  read: boolean;
  createdAt: string;
}

export interface NotificationsOverview {
  notifications: NotificationResponse[];
  unreadCount: number;
}

/** Event sent in real time: the new unread count, with the notification that changed it, if one was added. */
export interface NotificationEvent {
  unreadCount: number;
  notification?: NotificationResponse;
}

const LATEST_LIMIT = 30;

function toNotificationResponse(
  notification: Notification,
  actor: User,
): NotificationResponse {
  return {
    id: notification.id,
    type: notification.type,
    actor: toPublicUser(actor),
    read: notification.readAt !== null,
    createdAt: notification.createdAt.toISOString(),
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly streams: NotificationStreams,
  ) {}

  /** Latest notifications of the user, the newest first. */
  async overview(userId: string): Promise<NotificationsOverview> {
    const [latest, unreadCount] = await Promise.all([
      this.notifications.find({
        where: { userId },
        relations: { actor: true },
        order: { createdAt: 'DESC' },
        take: LATEST_LIMIT,
      }),
      this.unreadCount(userId),
    ]);
    return {
      notifications: latest.map((notification) =>
        toNotificationResponse(notification, notification.actor!),
      ),
      unreadCount,
    };
  }

  async markAllRead(userId: string): Promise<void> {
    const { affected } = await this.notifications.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    if (affected) {
      this.streams.send(userId, { unreadCount: 0 } satisfies NotificationEvent);
    }
  }

  /**
   * Notifies a user that the actor did something. A previous notification of
   * the same kind from the same actor is replaced, so that repeating the
   * action (e.g. follow, unfollow, follow) does not pile them up.
   */
  async notify(
    userId: string,
    type: NotificationType,
    actor: User,
  ): Promise<void> {
    await this.notifications.delete({ userId, type, actorId: actor.id });
    const notification = await this.notifications.save(
      this.notifications.create({ userId, type, actorId: actor.id }),
    );
    this.streams.send(userId, {
      unreadCount: await this.unreadCount(userId),
      notification: toNotificationResponse(notification, actor),
    } satisfies NotificationEvent);
  }

  /** Withdraws an unread notification once its cause is undone, e.g. on unfollow. */
  async withdraw(
    userId: string,
    type: NotificationType,
    actorId: string,
  ): Promise<void> {
    const { affected } = await this.notifications.delete({
      userId,
      type,
      actorId,
      readAt: IsNull(),
    });
    if (affected) {
      this.streams.send(userId, {
        unreadCount: await this.unreadCount(userId),
      } satisfies NotificationEvent);
    }
  }

  private unreadCount(userId: string): Promise<number> {
    return this.notifications.countBy({ userId, readAt: IsNull() });
  }
}
