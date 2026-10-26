import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AdminUser } from '../users/admin-user.entity';

/**
 * Append-only record of the back-office actions: a database trigger rejects
 * any update, deletion or truncation.
 */
@Entity('audit_log')
@Index('IDX_audit_log_target', ['targetType', 'targetId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_audit_log' })
  id!: string;

  /** Null for actions run outside the back office (command line). */
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  @Index('IDX_audit_log_actor')
  actorId!: string | null;

  @ManyToOne(() => AdminUser, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'actor_id',
    foreignKeyConstraintName: 'FK_audit_log_actor',
  })
  actor?: AdminUser;

  /** Dotted name of the action, e.g. `admin-users.update-role`. */
  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ name: 'target_type', type: 'varchar', length: 50, nullable: true })
  targetType!: string | null;

  @Column({ name: 'target_id', type: 'varchar', length: 100, nullable: true })
  targetId!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason!: string | null;

  /** False when the action was attempted but failed. */
  @Column({ type: 'boolean' })
  succeeded!: boolean;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index('IDX_audit_log_created_at')
  createdAt!: Date;
}
