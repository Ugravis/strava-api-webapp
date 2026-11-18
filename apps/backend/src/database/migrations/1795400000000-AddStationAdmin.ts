import { MigrationInterface, QueryRunner } from 'typeorm';

/** `refresh_user_tiles` as of `AddUserTilesChangeSeq`, restored by `down`. */
const REFRESH_USER_TILES_BODY = `
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
        SET version = user_tile_metrics.version + 1, changed_at = now();`;

/**
 * The stations seen by the back office: the number of accounts holding each
 * one, kept by the changes of the tiles, and a name or a mask set by the
 * team, kept over the imports of OpenStreetMap.
 */
export class AddStationAdmin1795400000000 implements MigrationInterface {
  name = 'AddStationAdmin1795400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "places" ADD "holders" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "places" ADD "custom_name" text`);
    await queryRunner.query(
      `ALTER TABLE "places" ADD "hidden_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_places_holders" ON "places" ("holders")`,
    );
    await queryRunner.query(
      `UPDATE places p SET holders = n.holders FROM (
         SELECT t.place_id, count(DISTINCT u.user_id)::int AS holders
         FROM place_tiles t
         JOIN user_tiles u ON u.x = t.x AND u.y = t.y AND u.mask & (1::bigint << t.bit) <> 0
         GROUP BY t.place_id
       ) n WHERE p.id = n.place_id`,
    );
    // Same function, the holders of the places of the changed tiles moved
    // by the accounts gaining or losing them: an increment, right whatever
    // the order of the transactions of several accounts, the rows of the
    // places locked in the order of their ids.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION refresh_user_tiles(user_ids uuid[], xs integer[], ys integer[])
      RETURNS void LANGUAGE plpgsql AS $$
      DECLARE
        changed_user uuid;
        change bigint;
        place_ids integer[];
        deltas integer[];
      BEGIN
        FOR changed_user IN SELECT DISTINCT u FROM unnest(user_ids) AS u ORDER BY u LOOP
          PERFORM pg_advisory_xact_lock(hashtextextended('user_tiles ' || changed_user, 0));
        END LOOP;
        change := nextval('user_tiles_change_seq');
        -- Before the tiles change: a place is held through any small tile of its zone.
        -- A user being deleted is skipped, its places released by the trigger of the users.
        WITH changed AS (
          SELECT DISTINCT c.user_id, c.x, c.y FROM unnest(user_ids, xs, ys) AS c(user_id, x, y)
          WHERE EXISTS (SELECT 1 FROM users WHERE id = c.user_id)
        ),
        merged AS (
          SELECT c.user_id, c.x, c.y, COALESCE(bit_or(t.mask), 0) AS mask
          FROM changed c
          LEFT JOIN activity_tiles t USING (user_id, x, y)
          GROUP BY c.user_id, c.x, c.y
        ),
        -- Each small tile of a zone within a changed tile, set before and after.
        changed_bits AS (
          SELECT m.user_id, t.place_id,
            COALESCE(u.mask, 0) & (1::bigint << t.bit) <> 0 AS was_set,
            m.mask & (1::bigint << t.bit) <> 0 AS is_set
          FROM merged m
          JOIN place_tiles t ON t.x = m.x AND t.y = m.y
          LEFT JOIN user_tiles u ON u.user_id = m.user_id AND u.x = m.x AND u.y = m.y
        ),
        -- The small tiles of each zone the user gains, negative when it loses some.
        moved AS (
          SELECT user_id, place_id,
            count(*) FILTER (WHERE is_set) - count(*) FILTER (WHERE was_set) AS gained
          FROM changed_bits GROUP BY user_id, place_id
          HAVING count(*) FILTER (WHERE is_set) <> count(*) FILTER (WHERE was_set)
        ),
        -- Index lookups only: the estimates of the arrays would turn a join on a CTE into a loop.
        states AS (
          SELECT m.place_id, m.gained,
            count(*) FILTER (WHERE u.mask & (1::bigint << t.bit) <> 0) AS before
          FROM moved m
          JOIN place_tiles t ON t.place_id = m.place_id
          LEFT JOIN user_tiles u ON u.user_id = m.user_id AND u.x = t.x AND u.y = t.y
          GROUP BY m.user_id, m.place_id, m.gained
        )
        SELECT array_agg(place_id ORDER BY place_id), array_agg(delta ORDER BY place_id)
        INTO place_ids, deltas
        FROM (
          SELECT place_id, sum(CASE WHEN before = 0 THEN 1 WHEN before + gained = 0 THEN -1 ELSE 0 END)::int AS delta
          FROM states GROUP BY place_id
        ) d WHERE delta <> 0;
        IF place_ids IS NOT NULL THEN
          PERFORM 1 FROM places WHERE id = ANY (place_ids) ORDER BY id FOR UPDATE;
          UPDATE places p SET holders = greatest(p.holders + d.delta, 0)
          FROM unnest(place_ids, deltas) AS d(id, delta) WHERE p.id = d.id;
        END IF;
${REFRESH_USER_TILES_BODY}
      END
      $$`);
    // A deleted account releases its places while its tiles are still there.
    await queryRunner.query(`
      CREATE FUNCTION release_user_places() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE
        place_ids integer[];
      BEGIN
        PERFORM pg_advisory_xact_lock(hashtextextended('user_tiles ' || OLD.id, 0));
        SELECT array_agg(DISTINCT t.place_id ORDER BY t.place_id) INTO place_ids
        FROM user_tiles u
        JOIN place_tiles t ON t.x = u.x AND t.y = u.y AND u.mask & (1::bigint << t.bit) <> 0
        WHERE u.user_id = OLD.id;
        IF place_ids IS NOT NULL THEN
          PERFORM 1 FROM places WHERE id = ANY (place_ids) ORDER BY id FOR UPDATE;
          UPDATE places SET holders = greatest(holders - 1, 0) WHERE id = ANY (place_ids);
        END IF;
        RETURN OLD;
      END
      $$`);
    await queryRunner.query(
      `CREATE TRIGGER users_release_places BEFORE DELETE ON users
       FOR EACH ROW EXECUTE FUNCTION release_user_places()`,
    );
    await queryRunner.query(
      `INSERT INTO "admin_role_permissions" ("role", "permission") VALUES ('admin', 'stations.edit') ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "admin_role_permissions" WHERE "permission" = 'stations.edit'`,
    );
    await queryRunner.query(`DROP TRIGGER users_release_places ON users`);
    await queryRunner.query(`DROP FUNCTION release_user_places()`);
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
${REFRESH_USER_TILES_BODY}
      END
      $$`);
    await queryRunner.query(`DROP INDEX "IDX_places_holders"`);
    await queryRunner.query(`ALTER TABLE "places" DROP COLUMN "hidden_at"`);
    await queryRunner.query(`ALTER TABLE "places" DROP COLUMN "custom_name"`);
    await queryRunner.query(`ALTER TABLE "places" DROP COLUMN "holders"`);
  }
}
