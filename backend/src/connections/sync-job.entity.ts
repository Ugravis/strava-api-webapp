import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProviderConnection } from './provider-connection.entity';

/**
 * - `backfill`: initial import of the activity history.
 * - `reconcile`: re-reads a recent window to catch missed webhook events.
 */
export type SyncJobKind = 'backfill' | 'reconcile';

export type SyncJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export const ACTIVE_SYNC_JOB_STATUSES: SyncJobStatus[] = ['queued', 'running'];

/** Persistent synchronization job, processed by the background worker. */
@Entity('sync_jobs')
// At most one pending or running job per connection.
@Index(['connectionId'], {
  unique: true,
  where: `"status" IN ('queued', 'running')`,
})
@Index(['status', 'runAfter'])
export class SyncJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'connection_id', type: 'uuid' })
  connectionId!: string;

  @ManyToOne(() => ProviderConnection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connection_id' })
  connection?: ProviderConnection;

  @Column({ type: 'varchar', length: 20 })
  kind!: SyncJobKind;

  @Column({ type: 'varchar', length: 20, default: 'queued' })
  status!: SyncJobStatus;

  /** Activities imported so far. */
  @Column({ type: 'integer', default: 0 })
  processed!: number;

  /** Activities to import, once known. */
  @Column({ type: 'integer', nullable: true })
  total!: number | null;

  /** Next page to read from the provider, so an interrupted job resumes where it stopped. */
  @Column({ name: 'next_page', type: 'integer', default: 1 })
  nextPage!: number;

  /** Not processed before this time (rate limit or retry delay). */
  @Column({ name: 'run_after', type: 'timestamptz', default: () => 'now()' })
  runAfter!: Date;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @Column({ name: 'error_code', type: 'varchar', length: 40, nullable: true })
  errorCode!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
