import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * What only a train station has leaves `places`, kept for what every kind
 * of place shares (summits next): one `stations` row per station.
 */
export class MoveStationDetails1796300000000 implements MigrationInterface {
  name = 'MoveStationDetails1796300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "stations" (
         "place_id" integer PRIMARY KEY REFERENCES "places"("id") ON DELETE CASCADE,
         "tourist" boolean NOT NULL DEFAULT false,
         "routes" integer NOT NULL DEFAULT 0,
         "operator" text,
         "network" text,
         "uic_ref" text
       )`,
    );
    await queryRunner.query(
      `INSERT INTO "stations" ("place_id", "tourist", "routes", "operator", "network", "uic_ref")
       SELECT "id", "tourist", "routes", "operator", "network", "uic_ref" FROM "places" WHERE "kind" = 'station'`,
    );
    await queryRunner.query(
      `ALTER TABLE "places" DROP "tourist", DROP "routes", DROP "operator", DROP "network", DROP "uic_ref"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "places"
         ADD "tourist" boolean NOT NULL DEFAULT false,
         ADD "routes" integer NOT NULL DEFAULT 0,
         ADD "operator" text,
         ADD "network" text,
         ADD "uic_ref" text`,
    );
    await queryRunner.query(
      `UPDATE "places" p SET "tourist" = s."tourist", "routes" = s."routes", "operator" = s."operator",
         "network" = s."network", "uic_ref" = s."uic_ref"
       FROM "stations" s WHERE s."place_id" = p."id"`,
    );
    await queryRunner.query(`DROP TABLE "stations"`);
  }
}
