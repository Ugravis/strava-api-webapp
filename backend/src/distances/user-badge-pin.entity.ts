import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Badge } from './badge.entity';

/** A badge pinned by a user, shown first among their badges. */
@Entity('user_badge_pins')
export class UserBadgePin {
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

  /** Pinned badges are listed by pin date. */
  @CreateDateColumn({ name: 'pinned_at', type: 'timestamptz' })
  pinnedAt!: Date;
}
