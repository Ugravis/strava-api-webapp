import { MigrationInterface, QueryRunner } from 'typeorm';

/** Every report in one table, `kind` telling a profile from the railway data, and the permission to process the latter. */
export class AddStationReports1796900000000 implements MigrationInterface {
  name = 'AddStationReports1796900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_reports" RENAME TO "reports"`);
    await queryRunner.query(
      `ALTER TABLE "reports" RENAME CONSTRAINT "PK_user_reports" TO "PK_reports"`,
    );
    for (const key of ['reporter', 'target', 'resolver']) {
      await queryRunner.query(
        `ALTER TABLE "reports" RENAME CONSTRAINT "FK_user_reports_${key}" TO "FK_reports_${key}"`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "reports" ADD "kind" character varying(16) NOT NULL DEFAULT 'user'`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ALTER COLUMN "kind" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "CHK_user_reports_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "CHK_reports_status" CHECK (("kind" = 'user' AND "status" IN ('open', 'sanctioned', 'dismissed')) OR ("kind" = 'station' AND "status" IN ('open', 'accepted', 'done', 'dismissed')))`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" RENAME CONSTRAINT "CHK_user_reports_not_self" TO "CHK_reports_not_self"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ALTER COLUMN "target_username" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "CHK_reports_user_target" CHECK ("kind" <> 'user' OR "target_username" IS NOT NULL)`,
    );
    await queryRunner.query(`DROP INDEX "UQ_user_reports_open"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_reports_user_open" ON "reports" ("reporter_id", "target_id") WHERE "kind" = 'user' AND "status" = 'open'`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_user_reports_target" RENAME TO "IDX_reports_target"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_user_reports_status_created" RENAME TO "IDX_reports_status_created"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD "place_id" integer, ADD "station_name" text, ADD "dismissal" character varying(32), ADD "completed_by_id" uuid, ADD "completion_note" text, ADD "completed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reports_place" ON "reports" ("place_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_reports_place" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_reports_completer" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "admin_role_permissions" ("role", "permission") VALUES ('admin', 'stations.reports') ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "admin_role_permissions" WHERE "permission" = 'stations.reports'`,
    );
    await queryRunner.query(`DELETE FROM "reports" WHERE "kind" <> 'user'`);
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_completer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_place"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_reports_place"`);
    await queryRunner.query(
      `ALTER TABLE "reports" DROP COLUMN "completed_at", DROP COLUMN "completion_note", DROP COLUMN "completed_by_id", DROP COLUMN "dismissal", DROP COLUMN "station_name", DROP COLUMN "place_id"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_reports_status_created" RENAME TO "IDX_user_reports_status_created"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_reports_target" RENAME TO "IDX_user_reports_target"`,
    );
    await queryRunner.query(`DROP INDEX "UQ_reports_user_open"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_reports_open" ON "reports" ("reporter_id", "target_id") WHERE "status" = 'open'`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "CHK_reports_user_target"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ALTER COLUMN "target_username" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" RENAME CONSTRAINT "CHK_reports_not_self" TO "CHK_user_reports_not_self"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "CHK_reports_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "CHK_user_reports_status" CHECK ("status" IN ('open', 'sanctioned', 'dismissed'))`,
    );
    await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "kind"`);
    for (const key of ['reporter', 'target', 'resolver']) {
      await queryRunner.query(
        `ALTER TABLE "reports" RENAME CONSTRAINT "FK_reports_${key}" TO "FK_user_reports_${key}"`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "reports" RENAME CONSTRAINT "PK_reports" TO "PK_user_reports"`,
    );
    await queryRunner.query(`ALTER TABLE "reports" RENAME TO "user_reports"`);
  }
}
