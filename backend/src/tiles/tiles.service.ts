import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import type { StreamReason } from './activity-tile-state.entity';
import {
  fromSignedMask,
  SUBTILE_ZOOM,
  TILE_ZOOM,
  TileSet,
  toSignedMask,
} from './tile-grid';
import type { ActivityTiles, TrackAssessment } from './track-tiles';

/** An activity whose full track is awaited. */
export interface PendingStream {
  activityId: string;
  userId: string;
  reason: StreamReason;
  hiddenStartM: number;
  hiddenEndM: number;
  /** Including the current one. */
  attempts: number;
}

/** Activities that crossed one tile. */
export interface TileVisits {
  activities: number;
  firstVisitedAt: string | null;
  lastVisitedAt: string | null;
  /** The latest ones first. */
  recent: {
    id: string;
    name: string;
    sportType: string;
    startedAt: string;
  }[];
}

/** Activities listed in the details of a tile. */
const RECENT_VISITS = 5;

export interface TileProgress {
  activities: number;
  /** Activities whose tiles are computed, at least from the simplified track. */
  computed: number;
  /** Activities awaiting their full track to refine their tiles. */
  refining: number;
}

/** Delay before a claimed activity may be claimed again, should the process stop. */
const CLAIM_LEASE = "interval '10 minutes'";

/** Provider-agnostic storage of the tiles crossed by the activities. */
@Injectable()
export class TilesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Activities among `activityIds` whose tiles were already handled. */
  async handled(activityIds: string[]): Promise<Set<string>> {
    if (activityIds.length === 0) {
      return new Set();
    }
    const rows: { activity_id: string }[] = await this.dataSource.query(
      'SELECT activity_id FROM activity_tile_states WHERE activity_id = ANY($1)',
      [activityIds],
    );
    return new Set(rows.map((row) => row.activity_id));
  }

  markNoTrack(activityId: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM activity_tiles WHERE activity_id = $1', [
        activityId,
      ]);
      await this.saveState(manager, activityId, {
        status: 'no_track',
        precision: null,
        streamReason: null,
        hiddenStartM: 0,
        hiddenEndM: 0,
      });
    });
  }

  /**
   * Stores the tiles of a simplified track. When `streamReason` is set, the
   * full track is queued to refine them.
   */
  saveFromSummary(
    userId: string,
    activityId: string,
    tiles: ActivityTiles,
    assessment: TrackAssessment,
    streamReason: StreamReason | null,
  ): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM activity_tiles WHERE activity_id = $1', [
        activityId,
      ]);
      await this.insertTiles(manager, userId, activityId, tiles);
      await this.saveState(manager, activityId, {
        status: streamReason ? 'pending_stream' : 'done',
        precision: 'summary',
        streamReason,
        hiddenStartM: assessment.hiddenStartM,
        hiddenEndM: assessment.hiddenEndM,
      });
    });
  }

  /** Replaces the tiles with those of the full track; the hidden areas are kept. */
  saveFromStream(
    pending: PendingStream,
    tiles: Pick<ActivityTiles, 'visited' | 'shared'>,
  ): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      // DELETE ... RETURNING resolves to [rows, row count].
      const [rows]: [{ x: number; y: number; hidden_mask: string }[], number] =
        await manager.query(
          `DELETE FROM activity_tiles WHERE activity_id = $1
           RETURNING x, y, hidden_mask`,
          [pending.activityId],
        );
      const hidden = TileSet.of(
        rows.map((row) => ({
          x: row.x,
          y: row.y,
          mask: fromSignedMask(row.hidden_mask),
        })),
      );
      await this.insertTiles(manager, pending.userId, pending.activityId, {
        ...tiles,
        hidden,
      });
      await manager.query(
        `UPDATE activity_tile_states
         SET status = 'done', precision = 'stream', stream_reason = NULL, updated_at = now()
         WHERE activity_id = $1`,
        [pending.activityId],
      );
    });
  }

  /** Ends the refinement while keeping the tiles of the simplified track. */
  async complete(activityId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE activity_tile_states
       SET status = 'done', stream_reason = NULL, updated_at = now()
       WHERE activity_id = $1`,
      [activityId],
    );
  }

  async defer(activityId: string, runAfter: Date): Promise<void> {
    await this.dataSource.query(
      `UPDATE activity_tile_states SET run_after = $2, updated_at = now()
       WHERE activity_id = $1`,
      [activityId, runAfter],
    );
  }

  /**
   * Atomically takes the oldest activity awaiting its full track. Oldest
   * first: once the area hidden around a usual start is resolved, the next
   * activities starting there no longer need their full track.
   */
  async claimNextStream(): Promise<PendingStream | null> {
    const [rows]: [
      {
        activity_id: string;
        stream_reason: StreamReason;
        hidden_start_m: number;
        hidden_end_m: number;
        attempts: number;
      }[],
      number,
    ] = await this.dataSource.query(
      `UPDATE activity_tile_states
       SET attempts = attempts + 1, run_after = now() + ${CLAIM_LEASE}
       WHERE activity_id = (
         SELECT s.activity_id FROM activity_tile_states s
         JOIN activities a ON a.id = s.activity_id
         WHERE s.status = 'pending_stream' AND s.run_after <= now()
         ORDER BY a.started_at
         FOR UPDATE OF s SKIP LOCKED
         LIMIT 1
       )
       RETURNING activity_id, stream_reason, hidden_start_m, hidden_end_m, attempts`,
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    const [activity]: { user_id: string }[] = await this.dataSource.query(
      'SELECT user_id FROM activities WHERE id = $1',
      [row.activity_id],
    );
    return {
      activityId: row.activity_id,
      userId: activity.user_id,
      reason: row.stream_reason,
      hiddenStartM: row.hidden_start_m,
      hiddenEndM: row.hidden_end_m,
      attempts: row.attempts,
    };
  }

  /**
   * Whether the areas hidden around the ends of an activity hold no small
   * tile left to discover: every one is already crossed, or lies in an area
   * already resolved by the full track of another activity.
   */
  async hiddenAreasCovered(pending: PendingStream): Promise<boolean> {
    const [row]: { uncovered: number }[] = await this.dataSource.query(
      `WITH own AS (
         SELECT x, y, hidden_mask FROM activity_tiles
         WHERE activity_id = $1 AND hidden_mask <> 0
       ),
       covered AS (
         SELECT t.x, t.y,
           bit_or(t.mask | CASE WHEN s.precision = 'stream' THEN t.hidden_mask ELSE 0 END) AS mask
         FROM activity_tiles t
         JOIN own USING (x, y)
         LEFT JOIN activity_tile_states s ON s.activity_id = t.activity_id
         WHERE t.user_id = $2
         GROUP BY t.x, t.y
       )
       SELECT count(*)::int AS uncovered
       FROM own LEFT JOIN covered USING (x, y)
       WHERE own.hidden_mask & ~COALESCE(covered.mask, 0) <> 0`,
      [pending.activityId, pending.userId],
    );
    return row.uncovered === 0;
  }

  /**
   * Activities of the user that crossed the tile `(x, y)` at `zoom`, either
   * a large tile (zoom 14) or a small one (zoom 17).
   */
  async visits(
    userId: string,
    zoom: typeof TILE_ZOOM | typeof SUBTILE_ZOOM,
    x: number,
    y: number,
  ): Promise<TileVisits> {
    const shift = SUBTILE_ZOOM - TILE_ZOOM;
    const side = 2 ** shift;
    const [tileX, tileY, bits] =
      zoom === TILE_ZOOM
        ? [x, y, -1n]
        : [
            x >> shift,
            y >> shift,
            1n << BigInt((y % side) * side + (x % side)),
          ];
    const params = [userId, tileX, tileY, toSignedMask(bits)];
    const filter = `FROM activity_tiles t JOIN activities a ON a.id = t.activity_id
       WHERE t.user_id = $1 AND t.x = $2 AND t.y = $3 AND t.mask & $4 <> 0`;
    const [summary]: {
      activities: number;
      first: Date | null;
      last: Date | null;
    }[] = await this.dataSource.query(
      `SELECT count(*)::int AS activities, min(a.started_at) AS first, max(a.started_at) AS last
       ${filter}`,
      params,
    );
    const recent: {
      id: string;
      name: string;
      sport_type: string;
      started_at: Date;
    }[] = await this.dataSource.query(
      `SELECT a.id, a.name, a.sport_type, a.started_at
       ${filter}
       ORDER BY a.started_at DESC
       LIMIT ${RECENT_VISITS}`,
      params,
    );
    return {
      activities: summary.activities,
      firstVisitedAt: summary.first?.toISOString() ?? null,
      lastVisitedAt: summary.last?.toISOString() ?? null,
      recent: recent.map((row) => ({
        id: row.id,
        name: row.name,
        sportType: row.sport_type,
        startedAt: row.started_at.toISOString(),
      })),
    };
  }

  /**
   * Gives up on the activities of a user whose tiles are still unknown after
   * a complete import: the provider no longer lists them.
   */
  async markUnhandledAsNoTrack(userId: string): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO activity_tile_states (activity_id, status)
       SELECT a.id, 'no_track' FROM activities a
       LEFT JOIN activity_tile_states s ON s.activity_id = a.id
       WHERE a.user_id = $1 AND s.activity_id IS NULL`,
      [userId],
    );
  }

  async progress(userId: string): Promise<TileProgress> {
    const [row]: TileProgress[] = await this.dataSource.query(
      `SELECT count(*)::int AS activities,
         count(s.activity_id)::int AS computed,
         count(*) FILTER (WHERE s.status = 'pending_stream')::int AS refining
       FROM activities a
       LEFT JOIN activity_tile_states s ON s.activity_id = a.id
       WHERE a.user_id = $1`,
      [userId],
    );
    return row;
  }

  /** Users owning activities whose tiles were never computed. */
  async usersWithUnhandledActivities(): Promise<string[]> {
    const rows: { user_id: string }[] = await this.dataSource.query(
      `SELECT DISTINCT a.user_id FROM activities a
       LEFT JOIN activity_tile_states s ON s.activity_id = a.id
       WHERE s.activity_id IS NULL`,
    );
    return rows.map((row) => row.user_id);
  }

  private async insertTiles(
    manager: EntityManager,
    userId: string,
    activityId: string,
    { visited, shared, hidden }: ActivityTiles,
  ): Promise<void> {
    const keys = new Map<string, { x: number; y: number }>();
    for (const set of [visited, shared, hidden]) {
      for (const { x, y } of set.cells()) keys.set(`${x}/${y}`, { x, y });
    }
    if (keys.size === 0) {
      return;
    }
    const values: unknown[] = [activityId, userId];
    const tuples = [...keys.values()].map(({ x, y }) => {
      values.push(
        x,
        y,
        toSignedMask(visited.maskAt(x, y)),
        toSignedMask(shared.maskAt(x, y)),
        toSignedMask(hidden.maskAt(x, y)),
      );
      const i = values.length;
      return `($1, $2, $${i - 4}, $${i - 3}, $${i - 2}, $${i - 1}, $${i})`;
    });
    await manager.query(
      `INSERT INTO activity_tiles (activity_id, user_id, x, y, mask, shared_mask, hidden_mask)
       VALUES ${tuples.join(', ')}`,
      values,
    );
  }

  private async saveState(
    manager: EntityManager,
    activityId: string,
    state: {
      status: 'no_track' | 'pending_stream' | 'done';
      precision: 'summary' | null;
      streamReason: StreamReason | null;
      hiddenStartM: number;
      hiddenEndM: number;
    },
  ): Promise<void> {
    await manager.query(
      `INSERT INTO activity_tile_states
         (activity_id, status, precision, stream_reason, hidden_start_m, hidden_end_m, attempts, run_after)
       VALUES ($1, $2, $3, $4, $5, $6, 0, now())
       ON CONFLICT (activity_id) DO UPDATE SET
         status = EXCLUDED.status, precision = EXCLUDED.precision,
         stream_reason = EXCLUDED.stream_reason, hidden_start_m = EXCLUDED.hidden_start_m,
         hidden_end_m = EXCLUDED.hidden_end_m, attempts = 0, run_after = now(), updated_at = now()`,
      [
        activityId,
        state.status,
        state.precision,
        state.streamReason,
        state.hiddenStartM,
        state.hiddenEndM,
      ],
    );
  }
}
