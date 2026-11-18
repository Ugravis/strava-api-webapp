import type {
  StationReportDismissal,
  StationReportReason,
  StationReportStatus,
} from '@kilotrace/shared';
import { ChildEntity, Column, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Place } from '../stations/place.entity';
import { User } from '../users/user.entity';
import { Report } from './report.entity';

/**
 * A user reporting the railway data: a station missing or wrong, about a
 * station (`placeId`) or not. Accepted, it waits for the change to be live,
 * then its author is told (`done`).
 */
@ChildEntity('station')
@Index('IDX_reports_place', ['placeId'])
export class StationReport extends Report {
  declare reason: StationReportReason;
  declare status: StationReportStatus;

  /** Null for a general report, or once the station is gone. */
  @Column({ name: 'place_id', type: 'integer', nullable: true })
  placeId!: number | null;

  @ManyToOne(() => Place, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'place_id' })
  place?: Place;

  /** Name of the station when reported, kept once it is renamed or gone. */
  @Column({ name: 'station_name', type: 'text', nullable: true })
  stationName!: string | null;

  /** Why it was dismissed, told to its author with the note. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  dismissal!: StationReportDismissal | null;

  /** The member who told the author the change is live. */
  @Column({ name: 'completed_by_id', type: 'uuid', nullable: true })
  completedById!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'completed_by_id' })
  completedBy?: User;

  @Column({ name: 'completion_note', type: 'text', nullable: true })
  completionNote!: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
}
