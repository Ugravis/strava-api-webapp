import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tiles of a country: the primary key starts with the tile, so looking a
 * country up (zone of a sector, countries left without totals) scanned the
 * whole table.
 */
export class IndexTileCountriesCountry1796600000000 implements MigrationInterface {
  name = 'IndexTileCountriesCountry1796600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_tile_countries_country_code" ON "tile_countries" ("country_code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_tile_countries_country_code"`);
  }
}
