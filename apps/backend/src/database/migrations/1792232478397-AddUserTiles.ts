import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTiles1792232478397 implements MigrationInterface {
  name = 'AddUserTiles1792232478397';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_tile_metrics" ("user_id" uuid NOT NULL, "version" bigint NOT NULL DEFAULT '1', "changed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "metrics" jsonb, "metrics_version" bigint, "computed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_d00a550dd95f69e8e1c175f56b8" PRIMARY KEY ("user_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_tiles" ("user_id" uuid NOT NULL, "x" integer NOT NULL, "y" integer NOT NULL, "mask" bigint NOT NULL, "max_cluster_mask" bigint NOT NULL DEFAULT '0', "in_max_cluster" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_58ca4eb8f75225443acc1be6bc0" PRIMARY KEY ("user_id", "x", "y"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tile_metrics" ADD CONSTRAINT "FK_d00a550dd95f69e8e1c175f56b8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tiles" ADD CONSTRAINT "FK_e117570fdf8261952610bb8c2e8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Recomputes the given cells of `user_tiles` from `activity_tiles` and
    // increments the version of their users. The refreshes of a user are
    // serialized by an advisory lock: taken after the changes of the
    // statement, it lets each refresh see the changes committed by the
    // previous ones, so that concurrent transactions lose no small tile.
    await queryRunner.query(`
      CREATE FUNCTION refresh_user_tiles(user_ids uuid[], xs integer[], ys integer[])
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
        -- A user being deleted is skipped.
        INSERT INTO user_tile_metrics (user_id)
        SELECT id FROM users WHERE id = ANY (user_ids)
        ON CONFLICT (user_id) DO UPDATE
        SET version = user_tile_metrics.version + 1, changed_at = now();
      END
      $$`);
    await queryRunner.query(`
      CREATE FUNCTION activity_tiles_inserted() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM refresh_user_tiles(array_agg(user_id), array_agg(x), array_agg(y)) FROM new_rows;
        RETURN NULL;
      END
      $$`);
    await queryRunner.query(`
      CREATE FUNCTION activity_tiles_deleted() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM refresh_user_tiles(array_agg(user_id), array_agg(x), array_agg(y)) FROM old_rows;
        RETURN NULL;
      END
      $$`);
    await queryRunner.query(`
      CREATE FUNCTION activity_tiles_updated() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM refresh_user_tiles(array_agg(user_id), array_agg(x), array_agg(y))
        FROM (SELECT user_id, x, y FROM old_rows UNION SELECT user_id, x, y FROM new_rows) AS rows;
        RETURN NULL;
      END
      $$`);
    // Statement triggers: one refresh per insertion of the tiles of an
    // activity, and per deletion, cascades included.
    await queryRunner.query(
      `CREATE TRIGGER activity_tiles_insert AFTER INSERT ON activity_tiles
       REFERENCING NEW TABLE AS new_rows
       FOR EACH STATEMENT EXECUTE FUNCTION activity_tiles_inserted()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER activity_tiles_delete AFTER DELETE ON activity_tiles
       REFERENCING OLD TABLE AS old_rows
       FOR EACH STATEMENT EXECUTE FUNCTION activity_tiles_deleted()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER activity_tiles_update AFTER UPDATE ON activity_tiles
       REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
       FOR EACH STATEMENT EXECUTE FUNCTION activity_tiles_updated()`,
    );

    await queryRunner.query(
      `INSERT INTO user_tiles (user_id, x, y, mask)
       SELECT user_id, x, y, bit_or(mask) FROM activity_tiles
       GROUP BY user_id, x, y
       HAVING bit_or(mask) <> 0`,
    );
    await queryRunner.query(
      `INSERT INTO user_tile_metrics (user_id)
       SELECT DISTINCT user_id FROM activity_tiles`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER activity_tiles_update ON activity_tiles`,
    );
    await queryRunner.query(
      `DROP TRIGGER activity_tiles_delete ON activity_tiles`,
    );
    await queryRunner.query(
      `DROP TRIGGER activity_tiles_insert ON activity_tiles`,
    );
    await queryRunner.query(`DROP FUNCTION activity_tiles_updated()`);
    await queryRunner.query(`DROP FUNCTION activity_tiles_deleted()`);
    await queryRunner.query(`DROP FUNCTION activity_tiles_inserted()`);
    await queryRunner.query(
      `DROP FUNCTION refresh_user_tiles(uuid[], integer[], integer[])`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tiles" DROP CONSTRAINT "FK_e117570fdf8261952610bb8c2e8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tile_metrics" DROP CONSTRAINT "FK_d00a550dd95f69e8e1c175f56b8"`,
    );
    await queryRunner.query(`DROP TABLE "user_tiles"`);
    await queryRunner.query(`DROP TABLE "user_tile_metrics"`);
  }
}
