import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * `follow`: the actor follows the user. `follow_request`: the actor asks to
 * follow the private profile of the user. `follow_accepted`: the actor
 * accepted the request of the user. `profile_like`: the actor liked the
 * profile of the user, who is never told by whom. `moderation`: the team
 * reset free fields of the profile. `strava_unlinked`: the team unlinked the
 * Strava account. `role_changed`: the team changed the back-office role of
 * the user, null once out of the team. The last three have no actor.
 */
export const NOTIFICATION_TYPES = [
  'follow',
  'follow_request',
  'follow_accepted',
  'profile_like',
  'moderation',
  'strava_unlinked',
  'role_changed',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Filters of the notifications list. */
export const NOTIFICATION_CATEGORIES = ['all', 'likes', 'follows'] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/** Kinds listed under each filter; `all` is not filtered. */
export const NOTIFICATION_CATEGORY_TYPES: Record<
  Exclude<NotificationCategory, 'all'>,
  NotificationType[]
> = {
  likes: ['profile_like'],
  follows: ['follow', 'follow_request', 'follow_accepted'],
};

/** Kinds whose actor is kept for the bookkeeping but never disclosed. */
/** What a notification from the team says beyond its kind. */
export interface NotificationDetails {
  reason?: string;
  fields?: string[];
  /** New back-office role, null once out of the team. */
  role?: string | null;
}

export const ANONYMOUS_NOTIFICATIONS: ReadonlySet<NotificationType> = new Set([
  'profile_like',
]);

/** Something that happened to a user, caused by another one (the actor). */
@Entity('notifications')
@Index('IDX_notifications_user_created', ['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Recipient. */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 32 })
  type!: NotificationType;

  /** Null for a notification from the team. */
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actor_id' })
  actor?: User;

  @Column({ type: 'jsonb', nullable: true })
  details!: NotificationDetails | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
