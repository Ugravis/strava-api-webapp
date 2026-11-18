import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Station zones (#189): a station is visited through any small tile of its
 * zone. Every place starts with the tile of its point, as before.
 */
export class AddStationZones1795200000000 implements MigrationInterface {
  name = 'AddStationZones1795200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "places" ADD "footprint" geometry(MultiPolygon,4326)`,
    );
    await queryRunner.query(
      `ALTER TABLE "places" ADD "zone_source" character varying(8) NOT NULL DEFAULT 'point'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_places_footprint" ON "places" USING gist ("footprint")`,
    );
    await queryRunner.query(
      `CREATE TABLE "place_tiles" ("place_id" integer NOT NULL, "x" integer NOT NULL, "y" integer NOT NULL, "bit" smallint NOT NULL, CONSTRAINT "PK_place_tiles" PRIMARY KEY ("place_id", "x", "y", "bit"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_place_tiles_x_y" ON "place_tiles" ("x", "y")`,
    );
    await queryRunner.query(
      `ALTER TABLE "place_tiles" ADD CONSTRAINT "FK_place_tiles_place" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "place_tiles" ("place_id", "x", "y", "bit") SELECT "id", "x", "y", "bit" FROM "places"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "place_tiles"`);
    await queryRunner.query(`DROP INDEX "IDX_places_footprint"`);
    await queryRunner.query(`ALTER TABLE "places" DROP COLUMN "zone_source"`);
    await queryRunner.query(`ALTER TABLE "places" DROP COLUMN "footprint"`);
  }
}
