import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from '../users/user.entity';

/**
 * Metrics of the stations visited by a user, computed by the station
 * metrics worker from a version of their tiles and of the stations: stale
 * once either changes.
 */
@Entity('user_station_metrics')
export class UserStationMetrics {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /** Ids of the stations of the largest network of visited stations. */
  @Column({
    name: 'max_cluster',
    type: 'integer',
    array: true,
    default: () => "'{}'",
  })
  maxCluster!: number[];

  /** Version of the tiles (`user_tile_metrics.version`) they were computed from. */
  @Column({ name: 'tiles_version', type: 'bigint' })
  tilesVersion!: string;

  /** Version of the first visits (`user_tile_metrics.gains_version`) the gains of the activities were replayed from. */
  @Column({ name: 'gains_version', type: 'bigint', nullable: true })
  gainsVersion!: string | null;

  /** Version of the stations (imports, zones, team edits) they were computed from. */
  @Column({ name: 'stations_version', type: 'text', nullable: true })
  stationsVersion!: string | null;

  @Column({ name: 'computed_at', type: 'timestamptz', default: () => 'now()' })
  computedAt!: Date;
}
