import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ActivityProvider } from '../activities/activity-source.entity';
import { User } from '../users/user.entity';

/**
 * A data provider account linked by a user to import activities. Unlike
 * `oauth_accounts`, it is not used to sign in. Tokens are encrypted at rest.
 */
@Entity('provider_connections')
@Index(['userId', 'provider'], { unique: true })
@Index(['provider', 'providerAccountId'], { unique: true })
export class ProviderConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 20 })
  provider!: ActivityProvider;

  /** Account identifier at the provider (the Strava athlete id). */
  @Column({ name: 'provider_account_id', type: 'varchar', length: 64 })
  providerAccountId!: string;

  /** Name of the provider account, shown in the connection settings. */
  @Column({
    name: 'account_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  accountName!: string | null;

  /** Scopes granted by the user, which may be fewer than requested. */
  @Column({ type: 'simple-array' })
  scopes!: string[];

  @Column({ name: 'access_token_encrypted', type: 'text' })
  accessTokenEncrypted!: string;

  @Column({ name: 'refresh_token_encrypted', type: 'text' })
  refreshTokenEncrypted!: string;

  @Column({ name: 'access_token_expires_at', type: 'timestamptz' })
  accessTokenExpiresAt!: Date;

  /** End of the last successful synchronization. */
  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
