import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Append-only record of the back-office actions: a database trigger rejects
 * deletions, truncations and any update outside the masking columns. Actor
 * and target ids carry no foreign key, so that an entry outlives them.
 */
@Entity('admin_audit_log')
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_admin_audit_log',
  })
  id!: string;

  /** Null for actions run outside a request (startup bootstrap). */
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  /** Dotted name of the action, e.g. `roles.grant`. */
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

  /** HTTP status of the response, null outside a request. */
  @Column({ type: 'smallint', nullable: true })
  status!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /** Set by a super-admin: the entry is then shown to super-admins only. */
  @Column({ name: 'hidden_at', type: 'timestamptz', nullable: true })
  hiddenAt!: Date | null;

  @Column({ name: 'hidden_by', type: 'uuid', nullable: true })
  hiddenBy!: string | null;
}
