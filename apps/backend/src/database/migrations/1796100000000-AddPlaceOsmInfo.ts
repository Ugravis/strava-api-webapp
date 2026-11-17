import { MigrationInterface, QueryRunner } from 'typeorm';

/** What OpenStreetMap says of each place, refreshed by the imports. */
export class AddPlaceOsmInfo1796100000000 implements MigrationInterface {
  name = 'AddPlaceOsmInfo1796100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "places"
         ADD "category" varchar(16),
         ADD "tourist" boolean NOT NULL DEFAULT false,
         ADD "routes" integer NOT NULL DEFAULT 0,
         ADD "operator" text,
         ADD "network" text,
         ADD "uic_ref" text,
         ADD "wikidata" text,
         ADD "osm_tags" jsonb NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "places"
         DROP "category", DROP "tourist", DROP "routes", DROP "operator",
         DROP "network", DROP "uic_ref", DROP "wikidata", DROP "osm_tags"`,
    );
  }
}
