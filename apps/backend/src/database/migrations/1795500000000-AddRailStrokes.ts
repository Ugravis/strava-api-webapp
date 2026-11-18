import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The railway generalized for the zoomed-out maps: each segment gets the
 * zoom its line shows from (`min_zoom`), and the lines themselves, merged
 * and simplified, serve the tiles zoomed out. Filled by the import of the
 * stations (`--strokes-only` from the segments in the database).
 */
export class AddRailStrokes1795500000000 implements MigrationInterface {
  name = 'AddRailStrokes1795500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rail_segments" ADD "min_zoom" smallint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE TABLE "rail_strokes" ("id" SERIAL NOT NULL, "min_zoom" smallint NOT NULL, "geom" geometry(MultiLineString,4326) NOT NULL, CONSTRAINT "PK_rail_strokes" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rail_strokes_geom" ON "rail_strokes" USING gist ("geom")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rail_strokes_min_zoom" ON "rail_strokes" ("min_zoom")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "rail_strokes"`);
    await queryRunner.query(
      `ALTER TABLE "rail_segments" DROP COLUMN "min_zoom"`,
    );
  }
}
