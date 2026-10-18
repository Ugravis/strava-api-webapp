import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type RailRegionStatus = 'pending' | 'done' | 'failed';

/**
 * A region of the railway (tile at zoom 9), fetched from OpenStreetMap
 * when one of its stations is visited, or when a walk along the tracks
 * reaches it.
 */
@Entity('rail_regions')
@Index(['status', 'requestedAt'])
export class RailRegion {
  @PrimaryColumn({ type: 'integer' })
  x!: number;

  @PrimaryColumn({ type: 'integer' })
  y!: number;

  @Column({ type: 'varchar', length: 8, default: 'pending' })
  status!: RailRegionStatus;

  @Column({ name: 'requested_at', type: 'timestamptz', default: () => 'now()' })
  requestedAt!: Date;

  /** Last successful fetch. */
  @Column({ name: 'fetched_at', type: 'timestamptz', nullable: true })
  fetchedAt!: Date | null;

  /** Date of the OSM data of the last fetch. */
  @Column({ name: 'osm_timestamp', type: 'timestamptz', nullable: true })
  osmTimestamp!: Date | null;

  /** Failed fetches in a row. */
  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  /** A failed region is fetched again from then on. */
  @Column({ name: 'retry_at', type: 'timestamptz', nullable: true })
  retryAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;
}
