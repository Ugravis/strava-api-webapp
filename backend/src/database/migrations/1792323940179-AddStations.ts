import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStations1792323940179 implements MigrationInterface {
  name = 'AddStations1792323940179';

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
      `CREATE TABLE "rail_ways" ("osm_id" bigint NOT NULL, "nodes" bigint array NOT NULL, "geom" geometry(LineString,4326) NOT NULL, CONSTRAINT "PK_b845fc382b084ef9d3edc0857f1" PRIMARY KEY ("osm_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1cd837e9e7e2b04a64470be6d4" ON "rail_ways" USING gist ("geom") `,
    );
    await queryRunner.query(
      `CREATE TABLE "rail_regions" ("x" integer NOT NULL, "y" integer NOT NULL, "status" character varying(8) NOT NULL DEFAULT 'pending', "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fetched_at" TIMESTAMP WITH TIME ZONE, "osm_timestamp" TIMESTAMP WITH TIME ZONE, "attempts" integer NOT NULL DEFAULT '0', "retry_at" TIMESTAMP WITH TIME ZONE, "error" text, CONSTRAINT "PK_2e90b6470899f04619e8c2c623b" PRIMARY KEY ("x", "y"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b9b071522871924d98794f5039" ON "rail_regions"  ("status", "requested_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "station_link_states" ("place_id" integer NOT NULL, "checked_at" TIMESTAMP WITH TIME ZONE, "linked_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_06b79905bdc96ed3df1f3462801" PRIMARY KEY ("place_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "rail_links" ADD CONSTRAINT "FK_6ddfa9609b93523d7d944222a46" FOREIGN KEY ("station_a") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rail_links" ADD CONSTRAINT "FK_6f96779aa206aa26dbad297160f" FOREIGN KEY ("station_b") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_link_states" ADD CONSTRAINT "FK_06b79905bdc96ed3df1f3462801" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "station_link_states" DROP CONSTRAINT "FK_06b79905bdc96ed3df1f3462801"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rail_links" DROP CONSTRAINT "FK_6f96779aa206aa26dbad297160f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rail_links" DROP CONSTRAINT "FK_6ddfa9609b93523d7d944222a46"`,
    );
    await queryRunner.query(`DROP TABLE "station_link_states"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b9b071522871924d98794f5039"`,
    );
    await queryRunner.query(`DROP TABLE "rail_regions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1cd837e9e7e2b04a64470be6d4"`,
    );
    await queryRunner.query(`DROP TABLE "rail_ways"`);
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
