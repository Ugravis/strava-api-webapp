import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivitiesAndStravaConnections1792073941190 implements MigrationInterface {
  name = 'AddActivitiesAndStravaConnections1792073941190';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "activities" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "sport_type" character varying(40) NOT NULL, "name" character varying(255) NOT NULL, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "timezone" character varying(64), "distance_m" double precision NOT NULL, "moving_time_s" integer NOT NULL, "elapsed_time_s" integer NOT NULL, "elevation_gain_m" double precision, "indoor" boolean NOT NULL DEFAULT false, "manual" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_417b1f7d26ebfbbbdc89a7906f" ON "activities"  ("user_id", "started_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "activity_sources" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "activity_id" uuid NOT NULL, "provider" character varying(20) NOT NULL, "external_id" character varying(64) NOT NULL, "fetched_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_013ca786144709e2e938e2e2c7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c15df9bf21852fc6ad748f73b3" ON "activity_sources"  ("activity_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4fd829be611d5648b3092d14eb" ON "activity_sources"  ("provider", "external_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "provider_connections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "provider" character varying(20) NOT NULL, "provider_account_id" character varying(64) NOT NULL, "account_name" character varying(255), "scopes" text NOT NULL, "access_token_encrypted" text NOT NULL, "refresh_token_encrypted" text NOT NULL, "access_token_expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "last_synced_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e214ce18aa55a4cf2518dc88293" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9e720648ef6dc81bf8af225d99" ON "provider_connections"  ("provider", "provider_account_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7834a5fbbebafbf4b1fb620340" ON "provider_connections"  ("user_id", "provider") `,
    );
    await queryRunner.query(
      `CREATE TABLE "sync_jobs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "connection_id" uuid NOT NULL, "kind" character varying(20) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'queued', "processed" integer NOT NULL DEFAULT '0', "total" integer, "next_page" integer NOT NULL DEFAULT '1', "run_after" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "attempts" integer NOT NULL DEFAULT '0', "error_code" character varying(40), "started_at" TIMESTAMP WITH TIME ZONE, "finished_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8586b15058c8811de6286052139" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3642d00913ef063c6e9fbac8bb" ON "sync_jobs"  ("status", "run_after") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_33d70be38d1c3d9bbf4b87753f" ON "sync_jobs"  ("connection_id") WHERE "status" IN ('queued', 'running')`,
    );
    await queryRunner.query(
      `CREATE TABLE "strava_webhook_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "object_type" character varying(20) NOT NULL, "object_id" character varying(64) NOT NULL, "aspect_type" character varying(20) NOT NULL, "owner_id" character varying(64) NOT NULL, "updates" jsonb NOT NULL DEFAULT '{}', "event_time" TIMESTAMP WITH TIME ZONE NOT NULL, "run_after" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "attempts" integer NOT NULL DEFAULT '0', "last_error" text, "processed_at" TIMESTAMP WITH TIME ZONE, "received_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c64b7493fb30bf973ba1dd4f746" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_70d833bdfc9499a7f77435090a" ON "strava_webhook_events"  ("processed_at", "run_after") `,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_b82f1d8368dd5305ae7e7e664c2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_sources" ADD CONSTRAINT "FK_c15df9bf21852fc6ad748f73b31" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_connections" ADD CONSTRAINT "FK_5ed63eaf6907ffba6b2fe8716ca" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sync_jobs" ADD CONSTRAINT "FK_7aded916c70731a278fcb106834" FOREIGN KEY ("connection_id") REFERENCES "provider_connections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sync_jobs" DROP CONSTRAINT "FK_7aded916c70731a278fcb106834"`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_connections" DROP CONSTRAINT "FK_5ed63eaf6907ffba6b2fe8716ca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_sources" DROP CONSTRAINT "FK_c15df9bf21852fc6ad748f73b31"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_b82f1d8368dd5305ae7e7e664c2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_70d833bdfc9499a7f77435090a"`,
    );
    await queryRunner.query(`DROP TABLE "strava_webhook_events"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_33d70be38d1c3d9bbf4b87753f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3642d00913ef063c6e9fbac8bb"`,
    );
    await queryRunner.query(`DROP TABLE "sync_jobs"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7834a5fbbebafbf4b1fb620340"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9e720648ef6dc81bf8af225d99"`,
    );
    await queryRunner.query(`DROP TABLE "provider_connections"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4fd829be611d5648b3092d14eb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c15df9bf21852fc6ad748f73b3"`,
    );
    await queryRunner.query(`DROP TABLE "activity_sources"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_417b1f7d26ebfbbbdc89a7906f"`,
    );
    await queryRunner.query(`DROP TABLE "activities"`);
  }
}
