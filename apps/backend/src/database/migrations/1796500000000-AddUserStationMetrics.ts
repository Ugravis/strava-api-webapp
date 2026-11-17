import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Metrics of the stations visited by each user (the largest network) and
 * what each activity brought to them: filled by the station metrics worker
 * for every user after the migration.
 */
export class AddUserStationMetrics1796500000000 implements MigrationInterface {
  name = 'AddUserStationMetrics1796500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_station_metrics" (
         "user_id" uuid NOT NULL,
         "max_cluster" integer array NOT NULL DEFAULT '{}',
         "max_cluster_m" integer NOT NULL DEFAULT 0,
         "other_clusters" integer NOT NULL DEFAULT 0,
         "other_clusters_m" integer NOT NULL DEFAULT 0,
         "tiles_version" bigint NOT NULL,
         "gains_version" bigint,
         "stations_version" text,
         "computed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         CONSTRAINT "PK_user_station_metrics" PRIMARY KEY ("user_id"),
         CONSTRAINT "FK_user_station_metrics_user" FOREIGN KEY ("user_id")
           REFERENCES "users"("id") ON DELETE CASCADE
       )`,
    );
    await queryRunner.query(
      `CREATE TABLE "activity_station_gains" (
         "activity_id" uuid NOT NULL,
         "user_id" uuid NOT NULL,
         "started_at" TIMESTAMP WITH TIME ZONE NOT NULL,
         "stations" integer NOT NULL,
         "max_cluster" integer NOT NULL,
         CONSTRAINT "PK_activity_station_gains" PRIMARY KEY ("activity_id"),
         CONSTRAINT "FK_activity_station_gains_activity" FOREIGN KEY ("activity_id")
           REFERENCES "activities"("id") ON DELETE CASCADE
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_station_gains_user" ON "activity_station_gains" ("user_id", "started_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "activity_station_gains"`);
    await queryRunner.query(`DROP TABLE "user_station_metrics"`);
  }
}
