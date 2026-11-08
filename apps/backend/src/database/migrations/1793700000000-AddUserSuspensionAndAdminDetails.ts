import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSuspensionAndAdminDetails1793700000000 implements MigrationInterface {
  name = 'AddUserSuspensionAndAdminDetails1793700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "suspended_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "suspended_until" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "suspension_reason" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "CHK_users_suspension" CHECK (("suspended_at" IS NULL) = ("suspension_reason" IS NULL) AND ("suspended_until" IS NULL OR "suspended_at" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_audit_log" ADD "details" jsonb`,
    );
    // Notifications sent by the team have no actor.
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "actor_id" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "notifications" ADD "details" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "details"`,
    );
    await queryRunner.query(
      `DELETE FROM "notifications" WHERE "actor_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "actor_id" SET NOT NULL`,
    );
    // The append-only trigger rejects updates, not a dropped column.
    await queryRunner.query(
      `ALTER TABLE "admin_audit_log" DROP COLUMN "details"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "CHK_users_suspension"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "suspension_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "suspended_until"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "suspended_at"`);
  }
}
