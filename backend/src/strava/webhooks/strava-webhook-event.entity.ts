import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type StravaWebhookObjectType = 'activity' | 'athlete';

/**
 * Inbox of the events pushed by Strava. They are stored before being
 * acknowledged (Strava expects a response within 2 seconds) and processed
 * later by the worker.
 */
@Entity('strava_webhook_events')
@Index(['processedAt', 'runAfter'])
export class StravaWebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'object_type', type: 'varchar', length: 20 })
  objectType!: StravaWebhookObjectType;

  @Column({ name: 'object_id', type: 'varchar', length: 64 })
  objectId!: string;

  /** `create`, `update` or `delete`. */
  @Column({ name: 'aspect_type', type: 'varchar', length: 20 })
  aspectType!: string;

  /** Athlete id at Strava. */
  @Column({ name: 'owner_id', type: 'varchar', length: 64 })
  ownerId!: string;

  @Column({ type: 'jsonb', default: {} })
  updates!: Record<string, unknown>;

  @Column({ name: 'event_time', type: 'timestamptz' })
  eventTime!: Date;

  @Column({ name: 'run_after', type: 'timestamptz', default: () => 'now()' })
  runAfter!: Date;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn({ name: 'received_at', type: 'timestamptz' })
  receivedAt!: Date;
}
