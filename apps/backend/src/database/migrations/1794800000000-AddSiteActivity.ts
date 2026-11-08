import { MigrationInterface, QueryRunner } from 'typeorm';

/** Site activity of the signed-in users: active days, page views, their query strings and their summaries. */
export class AddSiteActivity1794800000000 implements MigrationInterface {
  name = 'AddSiteActivity1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_activity" ("user_id" uuid NOT NULL, "day" date NOT NULL, CONSTRAINT "PK_user_activity" PRIMARY KEY ("user_id", "day"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_activity_day" ON "user_activity" ("day")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_activity" ADD CONSTRAINT "FK_user_activity_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "page_views" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "path" character varying(200) NOT NULL, "at" TIMESTAMP WITH TIME ZONE NOT NULL, "device" character varying(10) NOT NULL, "duration_ms" integer NOT NULL DEFAULT 0, CONSTRAINT "PK_page_views" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_page_views_at" ON "page_views" ("at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_page_views_user_at" ON "page_views" ("user_id", "at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_views" ADD CONSTRAINT "FK_page_views_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "page_view_daily" ("day" date NOT NULL, "hour" smallint NOT NULL, "path" character varying(200) NOT NULL, "device" character varying(10) NOT NULL, "team" boolean NOT NULL, "views" integer NOT NULL, "users" integer NOT NULL, "duration_ms" bigint NOT NULL, CONSTRAINT "PK_page_view_daily" PRIMARY KEY ("day", "hour", "path", "device", "team"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "page_view_queries" ("view_id" uuid NOT NULL, "query" character varying(500) NOT NULL, "duration_ms" integer NOT NULL DEFAULT 0, CONSTRAINT "PK_page_view_queries" PRIMARY KEY ("view_id", "query"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_view_queries" ADD CONSTRAINT "FK_page_view_queries_view" FOREIGN KEY ("view_id") REFERENCES "page_views"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "page_query_daily" ("day" date NOT NULL, "path" character varying(200) NOT NULL, "key" character varying(100) NOT NULL, "value" character varying(200) NOT NULL, "team" boolean NOT NULL, "views" integer NOT NULL, "users" integer NOT NULL, "duration_ms" bigint NOT NULL, CONSTRAINT "PK_page_query_daily" PRIMARY KEY ("day", "path", "key", "value", "team"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "page_query_daily"`);
    await queryRunner.query(`DROP TABLE "page_view_queries"`);
    await queryRunner.query(`DROP TABLE "page_view_daily"`);
    await queryRunner.query(`DROP TABLE "page_views"`);
    await queryRunner.query(`DROP TABLE "user_activity"`);
  }
}
