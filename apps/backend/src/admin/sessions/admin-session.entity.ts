import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AdminUser } from '../users/admin-user.entity';

@Entity('admin_sessions')
@Unique('UQ_admin_sessions_token_hash', ['tokenHash'])
export class AdminSession {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_admin_sessions',
  })
  id!: string;

  /** SHA-256 of the cookie token: a database leak does not expose live sessions. */
  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash!: string;

  @Column({ name: 'admin_user_id', type: 'uuid' })
  @Index('IDX_admin_sessions_admin_user')
  adminUserId!: string;

  @ManyToOne(() => AdminUser, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'admin_user_id',
    foreignKeyConstraintName: 'FK_admin_sessions_admin_user',
  })
  adminUser?: AdminUser;

  /** Absolute end of the session, whatever the activity. */
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt!: Date;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
