import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStations1792338461449 implements MigrationInterface {
  name = 'AddStations1792338461449';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "places" ("id" SERIAL NOT NULL, "kind" character varying(16) NOT NULL, "osm_type" character(1) NOT NULL, "osm_id" bigint NOT NULL, "name" text, "geom" geometry(Point,4326) NOT NULL, "x" integer NOT NULL, "y" integer NOT NULL, "bit" smallint NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1afab86e226b4c3bc9a74465c12" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bc0c7ec284d7a2527c176a73a8" ON "places" USING gist ("geom") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6456328ed5f67ff51629cd7f50" ON "places"  ("x", "y") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_acf9a3a68c5e48e50456287d21" ON "places"  ("osm_type", "osm_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "rail_links" ("id" SERIAL NOT NULL, "station_a" integer NOT NULL, "station_b" integer NOT NULL, "geom" geometry(LineString,4326) NOT NULL, "length_m" real NOT NULL, CONSTRAINT "CHK_df556ee92d8cfc144ed6f0f234" CHECK ("station_a" < "station_b"), CONSTRAINT "PK_68098a9c74693d40910f1f904a2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2bcd0382a38df92e7746df7814" ON "rail_links" USING gist ("geom") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6f96779aa206aa26dbad297160" ON "rail_links"  ("station_b") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b66449e68cad45776911c64e0f" ON "rail_links"  ("station_a", "station_b") `,
    );
    await queryRunner.query(
      `CREATE TABLE "rail_link_countries" ("link_id" integer NOT NULL, "country_code" character(2) NOT NULL, "length_m" real NOT NULL, CONSTRAINT "PK_3c6e07218f556abf9f496c7f12b" PRIMARY KEY ("link_id", "country_code"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_902fe2150bf098670bb9b94524" ON "rail_link_countries"  ("country_code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "railway_imports" ("id" SERIAL NOT NULL, "source" text NOT NULL, "report" jsonb NOT NULL, "imported_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a35e86b1d7c2204b619029ad597" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "rail_links" ADD CONSTRAINT "FK_6ddfa9609b93523d7d944222a46" FOREIGN KEY ("station_a") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rail_links" ADD CONSTRAINT "FK_6f96779aa206aa26dbad297160f" FOREIGN KEY ("station_b") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rail_link_countries" ADD CONSTRAINT "FK_fa91e9ac68f267bb1cc48e05c64" FOREIGN KEY ("link_id") REFERENCES "rail_links"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rail_link_countries" ADD CONSTRAINT "FK_902fe2150bf098670bb9b945247" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rail_link_countries" DROP CONSTRAINT "FK_902fe2150bf098670bb9b945247"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rail_link_countries" DROP CONSTRAINT "FK_fa91e9ac68f267bb1cc48e05c64"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rail_links" DROP CONSTRAINT "FK_6f96779aa206aa26dbad297160f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rail_links" DROP CONSTRAINT "FK_6ddfa9609b93523d7d944222a46"`,
    );
    await queryRunner.query(`DROP TABLE "railway_imports"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_902fe2150bf098670bb9b94524"`,
    );
    await queryRunner.query(`DROP TABLE "rail_link_countries"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b66449e68cad45776911c64e0f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6f96779aa206aa26dbad297160"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2bcd0382a38df92e7746df7814"`,
    );
    await queryRunner.query(`DROP TABLE "rail_links"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_acf9a3a68c5e48e50456287d21"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6456328ed5f67ff51629cd7f50"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bc0c7ec284d7a2527c176a73a8"`,
    );
    await queryRunner.query(`DROP TABLE "places"`);
  }
}
