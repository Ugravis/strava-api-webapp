import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCountries1792220862821 implements MigrationInterface {
  name = 'AddCountries1792220862821';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Installed by the PostGIS image, but not on every server.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(
      `CREATE TABLE "countries" ("code" character(2) NOT NULL, "total_tiles" integer, "total_subtiles" bigint, "outline" geometry(MultiPolygon,4326) NOT NULL, CONSTRAINT "PK_b47cbb5311bad9c9ae17b8c1eda" PRIMARY KEY ("code"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "country_parts" ("id" SERIAL NOT NULL, "country_code" character(2) NOT NULL, "geom" geometry(Polygon,3857) NOT NULL, CONSTRAINT "PK_2af13375dfe763434a7d259ad51" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c7977f87c10a6adbbdd1a992f6" ON "country_parts"  ("country_code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d9db4c2b8591abf5ef80799be2" ON "country_parts" USING gist ("geom") `,
    );
    await queryRunner.query(
      `CREATE TABLE "located_tiles" ("x" integer NOT NULL, "y" integer NOT NULL, "located_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_689731326d196d402df9c62ff52" PRIMARY KEY ("x", "y"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tile_countries" ("x" integer NOT NULL, "y" integer NOT NULL, "country_code" character(2) NOT NULL, "mask" bigint NOT NULL, CONSTRAINT "PK_76a464aee0174cfda787b0ecf63" PRIMARY KEY ("x", "y", "country_code"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "country_parts" ADD CONSTRAINT "FK_c7977f87c10a6adbbdd1a992f6d" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tile_countries" ADD CONSTRAINT "FK_ba9f0490c4b40be0d293ff673d2" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tile_countries" DROP CONSTRAINT "FK_ba9f0490c4b40be0d293ff673d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "country_parts" DROP CONSTRAINT "FK_c7977f87c10a6adbbdd1a992f6d"`,
    );
    await queryRunner.query(`DROP TABLE "tile_countries"`);
    await queryRunner.query(`DROP TABLE "located_tiles"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d9db4c2b8591abf5ef80799be2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c7977f87c10a6adbbdd1a992f6"`,
    );
    await queryRunner.query(`DROP TABLE "country_parts"`);
    await queryRunner.query(`DROP TABLE "countries"`);
  }
}
