import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Follow } from '../follows/follow.entity';
import { type PublicUser, toPublicUser } from '../users/dto/public-user';
import { User } from '../users/user.entity';
import { NotificationStreams } from './notification-streams';
import {
  ANONYMOUS_NOTIFICATIONS,
  NOTIFICATION_CATEGORY_TYPES,
  Notification,
  type NotificationCategory,
  type NotificationDetails,
  type NotificationType,
} from './notification.entity';

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  /** Null for an anonymous kind, e.g. a like, and for the team. */
  actor: PublicUser | null;
  /** Said by the team, e.g. the reason of a moderation. */
  details: NotificationDetails | null;
  read: boolean;
  createdAt: string;
  /** Whether the actor follows the user, who neither follows them nor asked to: offers to follow back. */
  followBack: boolean;
}

export interface NotificationsPage {
  notifications: NotificationResponse[];
  /** Whether older notifications follow. */
  hasMore: boolean;
  unreadCount: number;
}

/**
 * Event sent in real time: the new unread count, with the notification that
 * changed it, if one was added, or the ones marked read.
 */
export interface NotificationEvent {
  unreadCount: number;
  notification?: NotificationResponse;
  /** Marked read; every notification when empty. */
  read?: string[];
}

export const NOTIFICATIONS_PAGE_SIZE = 20;

function toNotificationResponse(
  notification: Notification,
  actor: User | null,
  followBack = false,
): NotificationResponse {
  return {
    id: notification.id,
    type: notification.type,
    actor:
      !actor || ANONYMOUS_NOTIFICATIONS.has(notification.type)
        ? null
        : toPublicUser(actor),
    details: notification.details,
    read: notification.readAt !== null,
    createdAt: notification.createdAt.toISOString(),
    followBack: notification.type === 'follow' && followBack,
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    @InjectRepository(Follow)
    private readonly follows: Repository<Follow>,
    private readonly streams: NotificationStreams,
  ) {}

  /** A page of the notifications of the user in a category, the newest first. */
  async page(
    userId: string,
    category: NotificationCategory,
    offset: number,
  ): Promise<NotificationsPage> {
    const [rows, unreadCount] = await Promise.all([
      this.notifications.find({
        where: {
          userId,
          ...(category !== 'all' && {
            type: In(NOTIFICATION_CATEGORY_TYPES[category]),
          }),
        },
        relations: { actor: true },
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: offset,
        // One more tells whether another page follows.
        take: NOTIFICATIONS_PAGE_SIZE + 1,
      }),
      this.unreadCount(userId),
    ]);
    const page = rows.slice(0, NOTIFICATIONS_PAGE_SIZE);
    const followed = await this.followedAmong(
      userId,
      page
        .filter(({ type }) => type === 'follow')
        .flatMap(({ actorId }) => actorId ?? []),
    );
    return {
      notifications: page.map((notification) =>
        toNotificationResponse(
          notification,
          notification.actor ?? null,
          !followed.has(notification.actorId ?? ''),
        ),
      ),
      hasMore: rows.length > NOTIFICATIONS_PAGE_SIZE,
      unreadCount,
    };
  }

  /** Marks the given notifications read, or those of a kind, or all of them. */
  async markRead(
    userId: string,
    ids?: string[],
    type?: NotificationType,
  ): Promise<void> {
    if (type) {
      const unread = await this.notifications.find({
        select: { id: true },
        where: { userId, type, readAt: IsNull(), ...(ids && { id: In(ids) }) },
      });
      ids = unread.map(({ id }) => id);
    }
    if (ids?.length === 0) return;
    const { affected } = await this.notifications.update(
      { userId, readAt: IsNull(), ...(ids && { id: In(ids) }) },
      { readAt: new Date() },
    );
    if (affected) {
      this.streams.send(userId, {
        unreadCount: await this.unreadCount(userId),
        read: ids ?? [],
      } satisfies NotificationEvent);
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
      notification: toNotificationResponse(
        notification,
        actor,
        type === 'follow' &&
          (await this.followedAmong(userId, [actor.id])).size === 0,
      ),
    } satisfies NotificationEvent);
  }

  /** Notifies a user of an action of the team, which stays anonymous. */
  async notifyFromTeam(
    userId: string,
    type: Extract<
      NotificationType,
      'moderation' | 'strava_unlinked' | 'role_changed'
    >,
    details: NotificationDetails,
  ): Promise<void> {
    const notification = await this.notifications.save(
      this.notifications.create({ userId, type, actorId: null, details }),
    );
    this.streams.send(userId, {
      unreadCount: await this.unreadCount(userId),
      notification: toNotificationResponse(notification, null),
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

  /** Deletes a notification, read or not, once it no longer makes sense, e.g. a declined request. */
  async discard(
    userId: string,
    type: NotificationType,
    actorId: string,
  ): Promise<void> {
    const { affected } = await this.notifications.delete({
      userId,
      type,
      actorId,
    });
    if (affected) {
      this.streams.send(userId, {
        unreadCount: await this.unreadCount(userId),
      } satisfies NotificationEvent);
    }
  }

  /**
   * Turns the notifications of a kind into another one, from one actor or
   * from all of them, marked read: the user acted on them, e.g. accepted
   * follow requests become follows.
   */
  async convert(
    userId: string,
    from: NotificationType,
    to: NotificationType,
    actorId?: string,
  ): Promise<void> {
    const where = { userId, type: from, ...(actorId && { actorId }) };
    // A notification of the target kind from the same actor would duplicate it.
    await this.notifications
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId AND type = :to', { userId, to })
      .andWhere(
        `actor_id IN (SELECT actor_id FROM notifications WHERE user_id = :userId AND type = :from${actorId ? ' AND actor_id = :actorId' : ''})`,
        { from, actorId },
      )
      .execute();
    const { affected } = await this.notifications.update(where, {
      type: to,
      readAt: () => 'coalesce(read_at, now())',
    });
    if (affected) {
      this.streams.send(userId, {
        unreadCount: await this.unreadCount(userId),
      } satisfies NotificationEvent);
    }
  }

  hasUnread(userId: string, type: NotificationType): Promise<boolean> {
    return this.notifications.existsBy({ userId, type, readAt: IsNull() });
  }

  /** Those of the users the user follows, or asked to. */
  private async followedAmong(
    userId: string,
    ids: string[],
  ): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const follows = await this.follows.find({
      select: { followedId: true },
      where: { followerId: userId, followedId: In(ids) },
    });
    return new Set(follows.map(({ followedId }) => followedId));
  }

  private unreadCount(userId: string): Promise<number> {
    return this.notifications.countBy({ userId, readAt: IsNull() });
  }
}
