import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Badge } from './badge.entity';

/** A favorite badge of a user, shown first among their badges. */
@Entity('user_favorite_badges')
export class UserFavoriteBadge {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'badge_id', type: 'varchar', length: 64 })
  badgeId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Badge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'badge_id' })
  badge?: Badge;

  /** Rank among the favorites of the user, chosen by the user. */
  @Column({ type: 'integer' })
  position!: number;

  @CreateDateColumn({ name: 'added_at', type: 'timestamptz' })
  addedAt!: Date;
}
