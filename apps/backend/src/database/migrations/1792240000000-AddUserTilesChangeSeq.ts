import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTilesChangeSeq1792240000000 implements MigrationInterface {
  name = 'AddUserTilesChangeSeq1792240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE user_tiles_change_seq`);
    await queryRunner.query(
      `ALTER TABLE "user_tiles" ADD "changed_seq" bigint NOT NULL DEFAULT '0'`,
    );
    // Same function, with the change sequence: its values are taken under
    // the lock of the user, so that a later change of a user always gets a
    // greater value, whatever the order of the transactions.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION refresh_user_tiles(user_ids uuid[], xs integer[], ys integer[])
      RETURNS void LANGUAGE plpgsql AS $$
      DECLARE
        changed_user uuid;
        change bigint;
      BEGIN
        FOR changed_user IN SELECT DISTINCT u FROM unnest(user_ids) AS u ORDER BY u LOOP
          PERFORM pg_advisory_xact_lock(hashtextextended('user_tiles ' || changed_user, 0));
        END LOOP;
        change := nextval('user_tiles_change_seq');
        WITH changed AS (
          SELECT DISTINCT user_id, x, y FROM unnest(user_ids, xs, ys) AS c(user_id, x, y)
        ),
        merged AS (
          SELECT c.user_id, c.x, c.y, COALESCE(bit_or(t.mask), 0) AS mask
          FROM changed c
          LEFT JOIN activity_tiles t USING (user_id, x, y)
          GROUP BY c.user_id, c.x, c.y
        ),
        removed AS (
          DELETE FROM user_tiles u USING merged m
          WHERE u.user_id = m.user_id AND u.x = m.x AND u.y = m.y AND m.mask = 0
        )
        INSERT INTO user_tiles (user_id, x, y, mask, changed_seq)
        SELECT user_id, x, y, mask, change FROM merged WHERE mask <> 0
        ON CONFLICT (user_id, x, y) DO UPDATE
        SET mask = EXCLUDED.mask, changed_seq = EXCLUDED.changed_seq
        WHERE user_tiles.mask <> EXCLUDED.mask;
        -- A user being deleted is skipped.
        INSERT INTO user_tile_metrics (user_id)
        SELECT id FROM users WHERE id = ANY (user_ids)
        ON CONFLICT (user_id) DO UPDATE
        SET version = user_tile_metrics.version + 1, changed_at = now();
      END
      $$`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION refresh_user_tiles(user_ids uuid[], xs integer[], ys integer[])
      RETURNS void LANGUAGE plpgsql AS $$
      DECLARE
        changed_user uuid;
      BEGIN
        FOR changed_user IN SELECT DISTINCT u FROM unnest(user_ids) AS u ORDER BY u LOOP
          PERFORM pg_advisory_xact_lock(hashtextextended('user_tiles ' || changed_user, 0));
        END LOOP;
        WITH changed AS (
          SELECT DISTINCT user_id, x, y FROM unnest(user_ids, xs, ys) AS c(user_id, x, y)
        ),
        merged AS (
          SELECT c.user_id, c.x, c.y, COALESCE(bit_or(t.mask), 0) AS mask
          FROM changed c
          LEFT JOIN activity_tiles t USING (user_id, x, y)
          GROUP BY c.user_id, c.x, c.y
        ),
        removed AS (
          DELETE FROM user_tiles u USING merged m
          WHERE u.user_id = m.user_id AND u.x = m.x AND u.y = m.y AND m.mask = 0
        )
        INSERT INTO user_tiles (user_id, x, y, mask)
        SELECT user_id, x, y, mask FROM merged WHERE mask <> 0
        ON CONFLICT (user_id, x, y) DO UPDATE SET mask = EXCLUDED.mask
        WHERE user_tiles.mask <> EXCLUDED.mask;
        INSERT INTO user_tile_metrics (user_id)
        SELECT id FROM users WHERE id = ANY (user_ids)
        ON CONFLICT (user_id) DO UPDATE
        SET version = user_tile_metrics.version + 1, changed_at = now();
      END
      $$`);
    await queryRunner.query(
      `ALTER TABLE "user_tiles" DROP COLUMN "changed_seq"`,
    );
    await queryRunner.query(`DROP SEQUENCE user_tiles_change_seq`);
  }
}
