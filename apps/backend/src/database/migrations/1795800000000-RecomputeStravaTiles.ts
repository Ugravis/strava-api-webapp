import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Recomputes the tiles of every Strava activity after the pause and
 * precision rules changed (#203): without a tile state, the next
 * maintenance queues a backfill that reads their tracks again. Users
 * without a Strava connection (bench accounts) keep their tiles: nothing
 * could compute them again.
 */
export class RecomputeStravaTiles1795800000000 implements MigrationInterface {
  name = 'RecomputeStravaTiles1795800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM activity_tile_states WHERE activity_id IN (
        SELECT a.id FROM activities a
        JOIN provider_connections c ON c.user_id = a.user_id AND c.provider = 'strava'
      )`);
    await queryRunner.query(`
      DELETE FROM activity_tiles WHERE user_id IN (
        SELECT user_id FROM provider_connections WHERE provider = 'strava'
      )`);
  }

  public async down(): Promise<void> {
    // The tiles are computed again from Strava: nothing to restore.
  }
}
