import { MigrationInterface, QueryRunner } from 'typeorm';

/** Reports of a user by another one, and the permission to process them. */
export class AddUserReports1794900000000 implements MigrationInterface {
  name = 'AddUserReports1794900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reporter_id" uuid, "target_id" uuid, "target_username" character varying(40) NOT NULL, "reason" character varying(32) NOT NULL, "details" character varying(500), "status" character varying(16) NOT NULL DEFAULT 'open', "sanction" character varying(16), "resolved_by_id" uuid, "resolution_note" text, "resolved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_user_reports" PRIMARY KEY ("id"), CONSTRAINT "CHK_user_reports_not_self" CHECK ("reporter_id" <> "target_id"), CONSTRAINT "CHK_user_reports_status" CHECK ("status" IN ('open', 'sanctioned', 'dismissed')))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_reports_open" ON "user_reports" ("reporter_id", "target_id") WHERE "status" = 'open'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_reports_target" ON "user_reports" ("target_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_reports_status_created" ON "user_reports" ("status", "created_at")`,
    );
    for (const [column, key] of [
      ['reporter_id', 'reporter'],
      ['target_id', 'target'],
      ['resolved_by_id', 'resolver'],
    ]) {
      await queryRunner.query(
        `ALTER TABLE "user_reports" ADD CONSTRAINT "FK_user_reports_${key}" FOREIGN KEY ("${column}") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
      );
    }
    await queryRunner.query(
      `INSERT INTO "admin_role_permissions" ("role", "permission") VALUES ('admin', 'reports.handle') ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "admin_role_permissions" WHERE "permission" = 'reports.handle'`,
    );
    await queryRunner.query(`DROP TABLE "user_reports"`);
  }
}
