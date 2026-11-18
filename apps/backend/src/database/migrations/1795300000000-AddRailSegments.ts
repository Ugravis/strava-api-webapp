import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Railway segments shared by several links, for ties drawn once: filled by
 * the import of the stations.
 */
export class AddRailSegments1795300000000 implements MigrationInterface {
  name = 'AddRailSegments1795300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "rail_segments" ("id" SERIAL NOT NULL, "geom" geometry(LineString,4326) NOT NULL, "link_ids" integer array NOT NULL, CONSTRAINT "PK_rail_segments" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rail_segments_geom" ON "rail_segments" USING gist ("geom")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rail_segments_link_ids" ON "rail_segments" USING gin ("link_ids")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "rail_segments"`);
  }
}
