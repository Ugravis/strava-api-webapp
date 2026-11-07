import {
  USER_REPORT_DETAILS_MAX_LENGTH,
  type UserReportReason,
} from '@kilotrace/shared';
import type {
  UserReportSanction,
  UserReportStatus,
} from '@kilotrace/shared/admin';
import {
  Check,
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
 * A user reporting another one, once at most while it stays open. Never told
 * to the target. Outlives both accounts, for the records of the team.
 */
@Entity('user_reports')
@Check('CHK_user_reports_not_self', '"reporter_id" <> "target_id"')
@Check(
  'CHK_user_reports_status',
  `"status" IN ('open', 'sanctioned', 'dismissed')`,
)
@Index('UQ_user_reports_open', ['reporterId', 'targetId'], {
  unique: true,
  where: `"status" = 'open'`,
})
@Index('IDX_user_reports_target', ['targetId'])
@Index('IDX_user_reports_status_created', ['status', 'createdAt'])
export class UserReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reporter_id', type: 'uuid', nullable: true })
  reporterId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reporter_id' })
  reporter?: User;

  @Column({ name: 'target_id', type: 'uuid', nullable: true })
  targetId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'target_id' })
  target?: User;

  /** Username of the target when reported, kept once it is reset or deleted. */
  @Column({ name: 'target_username', type: 'varchar', length: 40 })
  targetUsername!: string;

  @Column({ type: 'varchar', length: 32 })
  reason!: UserReportReason;

  @Column({
    type: 'varchar',
    length: USER_REPORT_DETAILS_MAX_LENGTH,
    nullable: true,
  })
  details!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status!: UserReportStatus;

  @Column({ type: 'varchar', length: 16, nullable: true })
  sanction!: UserReportSanction | null;

  @Column({ name: 'resolved_by_id', type: 'uuid', nullable: true })
  resolvedById!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by_id' })
  resolvedBy?: User;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
