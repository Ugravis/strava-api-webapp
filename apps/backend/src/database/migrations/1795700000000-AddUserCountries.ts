import { MigrationInterface, QueryRunner } from 'typeorm';

/** Taken by `refresh_user_tiles` (shared) and `CountriesService.locateTiles` (exclusive). */
const TILE_COUNTRIES_LOCK = `hashtextextended('tile_countries', 0)`;

/** Start of `refresh_user_tiles` as of `AddStationAdmin`: the locks, and the holders of the places. */
const STATION_HOLDERS = `
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
        END IF;`;

const CHANGED_AND_MERGED = `
        WITH changed AS (
          SELECT DISTINCT user_id, x, y FROM unnest(user_ids, xs, ys) AS c(user_id, x, y)
        ),
        merged AS (
          SELECT c.user_id, c.x, c.y, COALESCE(bit_or(t.mask), 0) AS mask
          FROM changed c
          LEFT JOIN activity_tiles t USING (user_id, x, y)
          GROUP BY c.user_id, c.x, c.y
        ),`;

const TILES_AND_METRICS = `
        removed AS (
          DELETE FROM user_tiles u USING merged m
          WHERE u.user_id = m.user_id AND u.x = m.x AND u.y = m.y AND m.mask = 0
        )
        INSERT INTO user_tiles (user_id, x, y, mask, changed_seq)
        SELECT user_id, x, y, mask, change FROM merged WHERE mask <> 0
        ON CONFLICT (user_id, x, y) DO UPDATE
        SET mask = EXCLUDED.mask, changed_seq = EXCLUDED.changed_seq
        WHERE user_tiles.mask <> EXCLUDED.mask;`;

const METRICS = `
        -- A user being deleted is skipped.
        INSERT INTO user_tile_metrics (user_id)
        SELECT id FROM users WHERE id = ANY (user_ids)
        ON CONFLICT (user_id) DO UPDATE
        SET version = user_tile_metrics.version + 1, changed_at = now();`;

/**
 * The large tiles gained or lost whole move the countries of the user, read
 * before the tiles change (same snapshot): the tiles not located yet are
 * counted by the worker as it locates them, the shared lock keeping both
 * apart.
 */
const COUNTRIES = `
        visited AS (
          SELECT m.user_id, t.country_code,
            sum(CASE WHEN m.mask <> 0 THEN 1 ELSE -1 END)::int AS delta
          FROM merged m
          JOIN tile_countries t ON t.x = m.x AND t.y = m.y
          LEFT JOIN user_tiles u ON u.user_id = m.user_id AND u.x = m.x AND u.y = m.y
          WHERE (u.user_id IS NOT NULL) <> (m.mask <> 0)
            AND EXISTS (SELECT 1 FROM users WHERE id = m.user_id)
          GROUP BY m.user_id, t.country_code
        ),
        counted AS (
          INSERT INTO user_countries (user_id, country_code, tiles)
          SELECT user_id, country_code, delta FROM visited
          ON CONFLICT (user_id, country_code) DO UPDATE
          SET tiles = user_countries.tiles + EXCLUDED.tiles
        ),`;

const refreshUserTiles = (body: string) => `
      CREATE OR REPLACE FUNCTION refresh_user_tiles(user_ids uuid[], xs integer[], ys integer[])
      RETURNS void LANGUAGE plpgsql AS $$
      DECLARE
        changed_user uuid;
        change bigint;
        place_ids integer[];
        deltas integer[];
      BEGIN
${body}
      END
      $$`;

/**
 * The countries visited by each account, counted by their large tiles: the
 * visitors of a country, read by the back office, kept by the changes of
 * the tiles and by the tiles located since.
 */
export class AddUserCountries1795700000000 implements MigrationInterface {
  name = 'AddUserCountries1795700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_countries" ("user_id" uuid NOT NULL, "country_code" character(2) NOT NULL, "tiles" integer NOT NULL, CONSTRAINT "PK_user_countries" PRIMARY KEY ("user_id", "country_code"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_countries_country" ON "user_countries" ("country_code")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_countries" ADD CONSTRAINT "FK_user_countries_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_countries" ADD CONSTRAINT "FK_user_countries_country" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_tiles_xy" ON "user_tiles" ("x", "y")`,
    );
    await queryRunner.query(
      `SELECT pg_advisory_xact_lock(${TILE_COUNTRIES_LOCK})`,
    );
    await queryRunner.query(
      `INSERT INTO user_countries (user_id, country_code, tiles)
       SELECT u.user_id, t.country_code, count(*)::int
       FROM user_tiles u JOIN tile_countries t USING (x, y)
       GROUP BY u.user_id, t.country_code`,
    );
    await queryRunner.query(
      refreshUserTiles(`${STATION_HOLDERS}
        PERFORM pg_advisory_xact_lock_shared(${TILE_COUNTRIES_LOCK});
${CHANGED_AND_MERGED}
${COUNTRIES}
${TILES_AND_METRICS}
        DELETE FROM user_countries WHERE user_id = ANY (user_ids) AND tiles <= 0;
${METRICS}`),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      refreshUserTiles(`${STATION_HOLDERS}
${CHANGED_AND_MERGED}
${TILES_AND_METRICS}
${METRICS}`),
    );
    await queryRunner.query(`DROP INDEX "IDX_user_tiles_xy"`);
    await queryRunner.query(`DROP TABLE "user_countries"`);
  }
}
