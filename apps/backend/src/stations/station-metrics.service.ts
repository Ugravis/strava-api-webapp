import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  replayStationGains,
  type StationFirstVisit,
  type StationLink,
  stationNetworks,
} from './station-clusters';
import { shownStation } from './shown-stations';
import { StationsService, VISITED_STATIONS } from './stations.service';

/** Delay without any change of the tiles before computing again. */
const SETTLE_DELAY = "interval '2 seconds'";
/** Longest wait of the metrics of a user whose tiles keep changing. */
const MAX_METRICS_AGE = "interval '30 seconds'";

/** A user whose station metrics follow older tiles or stations. */
export interface StaleStationMetrics {
  userId: string;
  tilesVersion: string;
  /** Version of the first visits, null until first replayed. */
  gainsVersion: string | null;
  stationsVersion: string | null;
}

/** What an activity brought to the stations of its user. */
export interface ActivityStationGains {
  /** Stations no earlier activity had reached. */
  stations: number;
  /** Growth of the largest network of visited stations. */
  maxCluster: number;
  /** Ids of the stations it reached first. */
  stationIds: number[];
}

/**
 * Storage of the metrics of the stations visited by each user (the largest
 * network), computed again whenever their tiles or the stations change.
 */
@Injectable()
export class StationMetricsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly stations: StationsService,
  ) {}

  /** The user whose metrics have waited the longest, once their tiles have settled. */
  async nextStale(): Promise<StaleStationMetrics | null> {
    const stationsVersion = await this.stations.stationsVersion();
    const [row]: {
      user_id: string;
      version: string;
      gains_version: string | null;
    }[] = await this.dataSource.query(
      `SELECT m.user_id, m.version::text, m.gains_version::text
         FROM user_tile_metrics m
         LEFT JOIN user_station_metrics s ON s.user_id = m.user_id
         WHERE (s.user_id IS NULL OR s.tiles_version <> m.version
             OR s.gains_version IS DISTINCT FROM m.gains_version
             OR s.stations_version IS DISTINCT FROM $1)
           AND (m.changed_at <= now() - ${SETTLE_DELAY}
             OR s.computed_at IS NULL
             OR s.computed_at <= now() - ${MAX_METRICS_AGE})
         ORDER BY m.changed_at
         LIMIT 1`,
      [stationsVersion],
    );
    return row
      ? {
          userId: row.user_id,
          tilesVersion: row.version,
          gainsVersion: row.gains_version,
          stationsVersion,
        }
      : null;
  }

  /**
   * Computes the metrics of the user and stores them with the versions they
   * follow: the largest network of the stations visited now, and what each
   * activity brought, replayed from the first visits (stations whose first
   * visit is not replayed yet left out). Returns the size of the network.
   */
  async compute({
    userId,
    tilesVersion,
    gainsVersion,
    stationsVersion,
  }: StaleStationMetrics): Promise<number> {
    const [row]: {
      ids: number[] | null;
      links: StationLink[] | null;
      first_visits: [number, string][] | null;
    }[] = await this.dataSource.query(
      `WITH visited AS MATERIALIZED (SELECT id FROM (${VISITED_STATIONS}) v),
       first_visits AS (
         SELECT DISTINCT ON (t.place_id) t.place_id, f.activity_id, f.visited_at
         FROM place_tiles t
         JOIN tile_first_visits f ON f.user_id = $1 AND f.x = t.x AND f.y = t.y
           AND f.mask & (1::bigint << t.bit) <> 0
         WHERE t.place_id IN (SELECT id FROM visited)
         ORDER BY t.place_id, f.visited_at, f.activity_id
       )
       SELECT (SELECT array_agg(id) FROM visited) AS ids,
         (SELECT json_agg(json_build_object(
            'a', l.station_a, 'b', l.station_b, 'lengthM', l.length_m))
          FROM rail_links l
          WHERE l.station_a IN (SELECT id FROM visited)
            AND l.station_b IN (SELECT id FROM visited)) AS links,
         (SELECT json_agg(json_build_array(place_id, activity_id)
            ORDER BY visited_at, activity_id, place_id)
          FROM first_visits) AS first_visits`,
      [userId],
    );
    const links = row.links ?? [];
    const networks = stationNetworks(row.ids ?? [], links);
    const firstVisits = (row.first_visits ?? []).map(
      ([stationId, activityId]): StationFirstVisit => ({
        stationId,
        activityId,
      }),
    );
    const gains = replayStationGains(firstVisits, links);
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `DELETE FROM activity_station_gains WHERE user_id = $1`,
        [userId],
      );
      if (gains.length > 0) {
        await manager.query(
          `INSERT INTO activity_station_gains
             (activity_id, user_id, started_at, stations, max_cluster)
           SELECT g.activity_id, $1, a.started_at, g.stations, g.max_cluster
           FROM unnest($2::uuid[], $3::int[], $4::int[])
             AS g(activity_id, stations, max_cluster)
           JOIN activities a ON a.id = g.activity_id`,
          [
            userId,
            gains.map((gain) => gain.activityId),
            gains.map((gain) => gain.stations),
            gains.map((gain) => gain.maxCluster),
          ],
        );
      }
      await manager.query(
        `INSERT INTO user_station_metrics (user_id, max_cluster, max_cluster_m,
           other_clusters, other_clusters_m, tiles_version, gains_version,
           stations_version, computed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
         ON CONFLICT (user_id) DO UPDATE SET max_cluster = EXCLUDED.max_cluster,
           max_cluster_m = EXCLUDED.max_cluster_m,
           other_clusters = EXCLUDED.other_clusters,
           other_clusters_m = EXCLUDED.other_clusters_m,
           tiles_version = EXCLUDED.tiles_version,
           gains_version = EXCLUDED.gains_version,
           stations_version = EXCLUDED.stations_version,
           computed_at = now()`,
        [
          userId,
          networks.maxCluster,
          networks.maxClusterM,
          networks.otherClusters,
          networks.otherClustersM,
          tilesVersion,
          gainsVersion,
          stationsVersion,
        ],
      );
    });
    return networks.maxCluster.length;
  }

  /**
   * Ids of the stations of the largest network for the history: today's
   * when the gains since `date` are shown apart, else the one before it.
   */
  async historyCluster(
    userId: string,
    gained: boolean,
    date: Date,
  ): Promise<number[]> {
    if (!gained) return this.clusterAt(userId, date);
    const [row]: { max_cluster: number[] }[] = await this.dataSource.query(
      `SELECT max_cluster FROM user_station_metrics WHERE user_id = $1`,
      [userId],
    );
    return row?.max_cluster ?? [];
  }

  /**
   * Ids of the stations of the largest network as it was before `date`:
   * the stations first visited before it, whose first visit is replayed.
   */
  private async clusterAt(userId: string, date: Date): Promise<number[]> {
    const [row]: { ids: number[] | null; links: StationLink[] | null }[] =
      await this.dataSource.query(
        `WITH visited AS MATERIALIZED (
           SELECT v.id FROM (${VISITED_STATIONS}) v
           WHERE EXISTS (
             SELECT 1 FROM place_tiles t
             JOIN tile_first_visits f ON f.user_id = $1 AND f.x = t.x AND f.y = t.y
               AND f.mask & (1::bigint << t.bit) <> 0
             WHERE t.place_id = v.id AND f.visited_at < $2
           )
         )
         SELECT (SELECT array_agg(id) FROM visited) AS ids,
           (SELECT json_agg(json_build_object(
              'a', l.station_a, 'b', l.station_b, 'lengthM', l.length_m))
            FROM rail_links l
            WHERE l.station_a IN (SELECT id FROM visited)
              AND l.station_b IN (SELECT id FROM visited)) AS links`,
        [userId, date],
      );
    return stationNetworks(row.ids ?? [], row.links ?? []).maxCluster;
  }

  /**
   * What the activity brought to the stations of the user, nothing when it
   * reached no new station; null until replayed from the latest first visits.
   */
  async forActivity(
    userId: string,
    activityId: string,
  ): Promise<ActivityStationGains | null> {
    const [row]: {
      replayed: boolean;
      stations: number | null;
      max_cluster: number | null;
      station_ids: number[] | null;
    }[] = await this.dataSource.query(
      `SELECT s.gains_version IS NOT NULL
           AND s.gains_version = m.gains_version AS replayed,
         g.stations, g.max_cluster,
         (SELECT array_agg(DISTINCT t.place_id) FROM place_tiles t
          JOIN tile_first_visits f ON f.activity_id = $2 AND f.user_id = $1
            AND f.x = t.x AND f.y = t.y AND f.mask & (1::bigint << t.bit) <> 0
          JOIN places p ON p.id = t.place_id AND ${shownStation()}
          -- Reached first by this activity, not earlier through another tile of its zone.
          WHERE NOT EXISTS (
            SELECT 1 FROM place_tiles t2
            JOIN tile_first_visits f2 ON f2.user_id = $1
              AND f2.x = t2.x AND f2.y = t2.y AND f2.mask & (1::bigint << t2.bit) <> 0
            WHERE t2.place_id = t.place_id
              AND (f2.visited_at, f2.activity_id) < (f.visited_at, f.activity_id)
          )) AS station_ids
       FROM user_tile_metrics m
       LEFT JOIN user_station_metrics s ON s.user_id = m.user_id
       LEFT JOIN activity_station_gains g
         ON g.activity_id = $2 AND g.user_id = m.user_id
       WHERE m.user_id = $1`,
      [userId, activityId],
    );
    if (!row?.replayed) return null;
    return {
      stations: row.stations ?? 0,
      maxCluster: row.max_cluster ?? 0,
      stationIds: row.station_ids ?? [],
    };
  }
}
