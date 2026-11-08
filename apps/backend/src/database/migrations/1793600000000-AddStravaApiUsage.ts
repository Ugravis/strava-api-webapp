import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStravaApiUsage1793600000000 implements MigrationInterface {
  name = 'AddStravaApiUsage1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "strava_api_usage" ("window_start" TIMESTAMP WITH TIME ZONE NOT NULL, "short_usage" integer, "short_limit" integer, "daily_usage" integer, "daily_limit" integer, "read_short_usage" integer, "read_short_limit" integer, "read_daily_usage" integer, "read_daily_limit" integer, CONSTRAINT "PK_strava_api_usage" PRIMARY KEY ("window_start"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "strava_api_usage"`);
  }
}
