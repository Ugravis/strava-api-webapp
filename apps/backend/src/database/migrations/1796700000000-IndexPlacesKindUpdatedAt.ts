import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Latest change of the stations (`stationsVersion`): read every few seconds
 * by the station metrics worker, it scanned the whole table and pushed the
 * rest of the database out of the cache.
 */
export class IndexPlacesKindUpdatedAt1796700000000 implements MigrationInterface {
  name = 'IndexPlacesKindUpdatedAt1796700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_places_kind_updated_at" ON "places" ("kind", "updated_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_places_kind_updated_at"`);
  }
}
