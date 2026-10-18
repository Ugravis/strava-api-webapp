import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { ActivityGains, LevelGains } from './activity-gains';

/** Changes this recent are left to settle: an import saves many activities in a row. */
const SETTLE_DELAY = "interval '2 seconds'";
/** Gains older than this are replayed again even while the tiles keep changing. */
const MAX_GAINS_AGE = "interval '1 minute'";

/**
 * Tiles of the activities of a user in typed arrays, copied cheaply to a
 * worker thread: each row points to its activity, in the order the
 * activities were recorded.
 */
export interface PackedActivityCells {
  activityCount: number;
  activities: Int32Array<ArrayBuffer>;
  xs: Int32Array<ArrayBuffer>;
  ys: Int32Array<ArrayBuffer>;
  /** Signed 64-bit masks. */
  masks: BigInt64Array<ArrayBuffer>;
}

/** A user whose gains are behind their tiles. */
export interface StaleGains {
  userId: string;
  version: string;
}

/** What an activity brought to one level of tiles when it was recorded. */
export interface LevelGainsResponse {
  /** Tiles no earlier activity had crossed, as `[x, y]` pairs. */
  gained: [number, number][];
  /** Growth of the largest cluster. */
  maxCluster: number;
  /** Tiles that became cluster tiles outside of the largest cluster. */
  otherClusters: number;
}

export interface ActivityGainsResponse {
  /** Large tiles (zoom 14). */
  tiles: LevelGainsResponse;
  /** Small tiles (zoom 17). */
  subtiles: LevelGainsResponse;
}

interface GainRow {
  activity_id: string;
  gained_tiles: number[];
  gained_subtiles: number[];
  max_cluster_tiles: number;
  other_cluster_tiles: number;
  max_cluster_subtiles: number;
  other_cluster_subtiles: number;
}

const flatten = (points: [number, number][]) => points.flat();
const pairs = (flat: number[]): [number, number][] =>
  Array.from({ length: flat.length / 2 }, (_, i) => [
    flat[2 * i],
    flat[2 * i + 1],
  ]);

function levelResponse(
  gained: number[],
  maxCluster: number,
  otherClusters: number,
): LevelGainsResponse {
  return { gained: pairs(gained), maxCluster, otherClusters };
}

function sameRow(a: GainRow, b: GainRow): boolean {
  return (
    a.max_cluster_tiles === b.max_cluster_tiles &&
    a.other_cluster_tiles === b.other_cluster_tiles &&
    a.max_cluster_subtiles === b.max_cluster_subtiles &&
    a.other_cluster_subtiles === b.other_cluster_subtiles &&
    a.gained_tiles.length === b.gained_tiles.length &&
    a.gained_subtiles.length === b.gained_subtiles.length &&
    a.gained_tiles.every((value, i) => value === b.gained_tiles[i]) &&
    a.gained_subtiles.every((value, i) => value === b.gained_subtiles[i])
  );
}

/** Storage of what each activity brought to the tiles of its user. */
@Injectable()
export class ActivityGainsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** The user whose gains have waited the longest, once their tiles have settled. */
  async nextStale(): Promise<StaleGains | null> {
    const [row]: { user_id: string; version: string }[] =
      await this.dataSource.query(
        `SELECT user_id, version::text FROM user_tile_metrics
         WHERE gains_version IS DISTINCT FROM version
           AND (changed_at <= now() - ${SETTLE_DELAY}
             OR gains_computed_at IS NULL
             OR gains_computed_at <= now() - ${MAX_GAINS_AGE})
         ORDER BY changed_at
         LIMIT 1`,
      );
    return row ? { userId: row.user_id, version: row.version } : null;
  }

  /** Tiles of the activities of the user, in the order they were recorded. */
  async packedCells(
    userId: string,
  ): Promise<{ ids: string[]; cells: PackedActivityCells }> {
    const rows: { id: string; x: number; y: number; mask: string }[] =
      await this.dataSource.query(
        `SELECT a.id, t.x, t.y, t.mask::text
         FROM activity_tiles t JOIN activities a ON a.id = t.activity_id
         WHERE t.user_id = $1
         ORDER BY a.started_at, a.id`,
        [userId],
      );
    const ids: string[] = [];
    const activities = new Int32Array(rows.length);
    rows.forEach((row, i) => {
      if (ids.at(-1) !== row.id) ids.push(row.id);
      activities[i] = ids.length - 1;
    });
    return {
      ids,
      cells: {
        activityCount: ids.length,
        activities,
        xs: Int32Array.from(rows, (row) => row.x),
        ys: Int32Array.from(rows, (row) => row.y),
        masks: BigInt64Array.from(rows, (row) => BigInt(row.mask)),
      },
    };
  }

  /**
   * Stores the gains replayed from the tiles at `version`. Only the
   * activities whose gains change are written: adding the latest activity
   * writes one row.
   */
  async save(
    { userId, version }: StaleGains,
    ids: string[],
    gains: ActivityGains[],
  ): Promise<void> {
    const level = ({ gained }: LevelGains) => flatten(gained);
    const computed: GainRow[] = gains.map(({ tiles, subtiles }, i) => ({
      activity_id: ids[i],
      gained_tiles: level(tiles),
      gained_subtiles: level(subtiles),
      max_cluster_tiles: tiles.maxCluster,
      other_cluster_tiles: tiles.otherClusters,
      max_cluster_subtiles: subtiles.maxCluster,
      other_cluster_subtiles: subtiles.otherClusters,
    }));
    const stored: GainRow[] = await this.dataSource.query(
      `SELECT activity_id, gained_tiles, gained_subtiles, max_cluster_tiles,
         other_cluster_tiles, max_cluster_subtiles, other_cluster_subtiles
       FROM activity_gains WHERE user_id = $1`,
      [userId],
    );
    const byId = new Map(stored.map((row) => [row.activity_id, row]));
    const changed = computed.filter((row) => {
      const previous = byId.get(row.activity_id);
      return !previous || !sameRow(previous, row);
    });
    await this.dataSource.transaction(async (manager) => {
      if (changed.length > 0) {
        await manager.query(
          `INSERT INTO activity_gains (activity_id, user_id, gained_tiles, gained_subtiles,
             max_cluster_tiles, other_cluster_tiles, max_cluster_subtiles, other_cluster_subtiles)
           SELECT r.activity_id, $1, r.gained_tiles, r.gained_subtiles, r.max_cluster_tiles,
             r.other_cluster_tiles, r.max_cluster_subtiles, r.other_cluster_subtiles
           FROM jsonb_to_recordset($2::jsonb) AS r(
             activity_id uuid, gained_tiles integer[], gained_subtiles integer[],
             max_cluster_tiles integer, other_cluster_tiles integer,
             max_cluster_subtiles integer, other_cluster_subtiles integer)
           -- An activity deleted meanwhile has no gains.
           WHERE EXISTS (SELECT 1 FROM activities a WHERE a.id = r.activity_id)
           ON CONFLICT (activity_id) DO UPDATE SET
             gained_tiles = EXCLUDED.gained_tiles,
             gained_subtiles = EXCLUDED.gained_subtiles,
             max_cluster_tiles = EXCLUDED.max_cluster_tiles,
             other_cluster_tiles = EXCLUDED.other_cluster_tiles,
             max_cluster_subtiles = EXCLUDED.max_cluster_subtiles,
             other_cluster_subtiles = EXCLUDED.other_cluster_subtiles`,
          [userId, JSON.stringify(changed)],
        );
      }
      // Activities left without tiles brought nothing.
      await manager.query(
        `DELETE FROM activity_gains
         WHERE user_id = $1 AND NOT (activity_id = ANY($2::uuid[]))`,
        [userId, ids],
      );
      await manager.query(
        `UPDATE user_tile_metrics SET gains_version = $2, gains_computed_at = now()
         WHERE user_id = $1`,
        [userId, version],
      );
    });
  }

  /** What one activity of the user brought; null until replayed. */
  async forActivity(
    userId: string,
    activityId: string,
  ): Promise<ActivityGainsResponse | null> {
    const [row]: GainRow[] = await this.dataSource.query(
      `SELECT activity_id, gained_tiles, gained_subtiles, max_cluster_tiles,
         other_cluster_tiles, max_cluster_subtiles, other_cluster_subtiles
       FROM activity_gains WHERE activity_id = $1 AND user_id = $2`,
      [activityId, userId],
    );
    if (!row) return null;
    return {
      tiles: levelResponse(
        row.gained_tiles,
        row.max_cluster_tiles,
        row.other_cluster_tiles,
      ),
      subtiles: levelResponse(
        row.gained_subtiles,
        row.max_cluster_subtiles,
        row.other_cluster_subtiles,
      ),
    };
  }
}
