import { MigrationInterface, QueryRunner } from 'typeorm';
import { COUNT_STATION_LINKS } from '../../stations/station-links';

/**
 * The links of a station and their length, stored to sort the stations by
 * them. Indexes in the order of the table of the back office (empty values
 * last, then the id), most first for the figures, A to Z for the operator:
 * a page read from the index rather than sorting every station.
 */
export class AddStationLinks1796400000000 implements MigrationInterface {
  name = 'AddStationLinks1796400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stations"
         ADD "links" integer NOT NULL DEFAULT 0,
         ADD "links_m" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(COUNT_STATION_LINKS);
    for (const [name, column] of [
      ['links', '"links" DESC NULLS LAST'],
      ['links_m', '"links_m" DESC NULLS LAST'],
      ['routes', '"routes" DESC NULLS LAST'],
      ['operator', '"operator"'],
    ]) {
      await queryRunner.query(
        `CREATE INDEX "IDX_stations_sort_${name}" ON "stations" (${column}, "place_id")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const name of ['links', 'links_m', 'routes', 'operator']) {
      await queryRunner.query(`DROP INDEX "IDX_stations_sort_${name}"`);
    }
    await queryRunner.query(
      `ALTER TABLE "stations" DROP "links", DROP "links_m"`,
    );
  }
}
