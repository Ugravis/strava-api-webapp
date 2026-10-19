import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlaceCountries1792446079980 implements MigrationInterface {
  name = 'AddPlaceCountries1792446079980';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "places" ADD "country_code" character(2)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d9ccb05dae0cb6925b0838d293" ON "places"  ("country_code") `,
    );
    await queryRunner.query(
      `ALTER TABLE "places" ADD CONSTRAINT "FK_d9ccb05dae0cb6925b0838d2936" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    // The country holding each place, or the nearest one within 2 km for a place on the coast.
    await queryRunner.query(`UPDATE "places" p SET "country_code" = (
          SELECT c.country_code FROM country_parts c
          WHERE ST_DWithin(c.geom, ST_Transform(p.geom, 3857), 2000)
          ORDER BY c.geom <-> ST_Transform(p.geom, 3857)
          LIMIT 1
        )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "places" DROP CONSTRAINT "FK_d9ccb05dae0cb6925b0838d2936"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d9ccb05dae0cb6925b0838d293"`,
    );
    await queryRunner.query(`ALTER TABLE "places" DROP COLUMN "country_code"`);
  }
}
