import type { UserReportReason } from '@kilotrace/shared';
import type {
  UserReportSanction,
  UserReportStatus,
} from '@kilotrace/shared/admin';
import { ChildEntity, Column, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';
import { Report } from './report.entity';

/**
 * A user reporting another one, once at most while it stays open. Never told
 * to the target.
 */
@ChildEntity('user')
@Index('UQ_reports_user_open', ['reporterId', 'targetId'], {
  unique: true,
  where: `"kind" = 'user' AND "status" = 'open'`,
})
@Index('IDX_reports_target', ['targetId'])
export class UserReport extends Report {
  declare reason: UserReportReason;
  declare status: UserReportStatus;

  @Column({ name: 'target_id', type: 'uuid', nullable: true })
  targetId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'target_id' })
  target?: User;

  /** Username of the target when reported, kept once it is reset or deleted. */
  @Column({
    name: 'target_username',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  targetUsername!: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  sanction!: UserReportSanction | null;
}
