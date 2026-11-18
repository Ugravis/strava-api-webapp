import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * A report sent by a user to the team, one table for every kind (`kind`):
 * a profile (`UserReport`) or the railway data (`StationReport`), the
 * columns of a kind empty for the others. Outlives the accounts, for the
 * records of the team.
 */
@Entity('reports')
@TableInheritance({
  column: { name: 'kind', type: 'varchar', length: 16 },
})
@Check(
  'CHK_reports_status',
  `("kind" = 'user' AND "status" IN ('open', 'sanctioned', 'dismissed')) OR ("kind" = 'station' AND "status" IN ('open', 'accepted', 'done', 'dismissed'))`,
)
@Check('CHK_reports_not_self', '"reporter_id" <> "target_id"')
@Check(
  'CHK_reports_user_target',
  `"kind" <> 'user' OR "target_username" IS NOT NULL`,
)
@Index('IDX_reports_status_created', ['status', 'createdAt'])
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reporter_id', type: 'uuid', nullable: true })
  reporterId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reporter_id' })
  reporter?: User;

  @Column({ type: 'varchar', length: 32 })
  reason!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  details!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status!: string;

  /** The member who decided. */
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
