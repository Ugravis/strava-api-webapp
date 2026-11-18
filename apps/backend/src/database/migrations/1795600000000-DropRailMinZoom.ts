import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The railway shows whole at every zoom: the zoom each line showed from is
 * dropped. `rail_strokes` keeps every line, filled again by the import
 * (`--strokes-only`).
 */
export class DropRailMinZoom1795600000000 implements MigrationInterface {
  name = 'DropRailMinZoom1795600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_rail_strokes_min_zoom"`);
    await queryRunner.query(
      `ALTER TABLE "rail_strokes" DROP COLUMN "min_zoom"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rail_segments" DROP COLUMN "min_zoom"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rail_segments" ADD "min_zoom" smallint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "rail_strokes" ADD "min_zoom" smallint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rail_strokes_min_zoom" ON "rail_strokes" ("min_zoom")`,
    );
  }
}
