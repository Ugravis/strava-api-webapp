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

  /** Meters of railway between the stations of the largest network. */
  @Column({ name: 'max_cluster_m', type: 'integer', default: 0 })
  maxClusterM!: number;

  /** Stations of the other networks of at least two stations. */
  @Column({ name: 'other_clusters', type: 'integer', default: 0 })
  otherClusters!: number;

  /** Meters of railway between the stations of the other networks. */
  @Column({ name: 'other_clusters_m', type: 'integer', default: 0 })
  otherClustersM!: number;

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
