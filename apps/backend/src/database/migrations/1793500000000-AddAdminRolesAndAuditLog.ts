import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminRolesAndAuditLog1793500000000 implements MigrationInterface {
  name = 'AddAdminRolesAndAuditLog1793500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "roles" character varying(20) array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "CHK_users_roles" CHECK ("roles" <@ ARRAY['support', 'admin', 'super-admin']::character varying[])`,
    );
    await queryRunner.query(
      `CREATE TABLE "admin_audit_log" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "actor_id" uuid, "action" character varying(100) NOT NULL, "target_type" character varying(50), "target_id" character varying(100), "reason" character varying(500), "succeeded" boolean NOT NULL, "status" smallint, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "hidden_at" TIMESTAMP WITH TIME ZONE, "hidden_by" uuid, CONSTRAINT "PK_admin_audit_log" PRIMARY KEY ("id"), CONSTRAINT "CHK_admin_audit_log_hidden" CHECK (("hidden_at" IS NULL) = ("hidden_by" IS NULL)))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_audit_log_created_at" ON "admin_audit_log" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_audit_log_actor" ON "admin_audit_log" ("actor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_audit_log_target" ON "admin_audit_log" ("target_type", "target_id")`,
    );
    // Append only: an update may change the masking columns and nothing else;
    // deletions and truncations are rejected.
    await queryRunner.query(
      `CREATE FUNCTION "admin_audit_log_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND to_jsonb(NEW) - 'hidden_at' - 'hidden_by' = to_jsonb(OLD) - 'hidden_at' - 'hidden_by' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'admin_audit_log is append-only (% rejected)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END
$$`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "TRG_admin_audit_log_append_only" BEFORE UPDATE OR DELETE ON "admin_audit_log" FOR EACH ROW EXECUTE FUNCTION "admin_audit_log_append_only"()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "TRG_admin_audit_log_no_truncate" BEFORE TRUNCATE ON "admin_audit_log" FOR EACH STATEMENT EXECUTE FUNCTION "admin_audit_log_append_only"()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admin_audit_log"`);
    await queryRunner.query(`DROP FUNCTION "admin_audit_log_append_only"()`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "CHK_users_roles"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`);
  }
}
