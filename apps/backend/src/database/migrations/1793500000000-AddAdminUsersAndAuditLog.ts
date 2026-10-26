import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminUsersAndAuditLog1793500000000 implements MigrationInterface {
  name = 'AddAdminUsersAndAuditLog1793500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "admin_users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(254) NOT NULL, "role" character varying(20) NOT NULL, "disabled_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_admin_users_email" UNIQUE ("email"), CONSTRAINT "CHK_admin_users_role" CHECK ("role" IN ('support', 'admin', 'super-admin')), CONSTRAINT "PK_admin_users" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "admin_sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "token_hash" character(64) NOT NULL, "admin_user_id" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL, "user_agent" character varying(512), "ip_address" character varying(45), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_admin_sessions_token_hash" UNIQUE ("token_hash"), CONSTRAINT "PK_admin_sessions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_sessions_admin_user" ON "admin_sessions" ("admin_user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_sessions" ADD CONSTRAINT "FK_admin_sessions_admin_user" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_log" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "actor_id" uuid, "action" character varying(100) NOT NULL, "target_type" character varying(50), "target_id" character varying(100), "reason" character varying(500), "succeeded" boolean NOT NULL, "ip_address" character varying(45), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_audit_log" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_actor" ON "audit_log" ("actor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_created_at" ON "audit_log" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_target" ON "audit_log" ("target_type", "target_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "FK_audit_log_actor" FOREIGN KEY ("actor_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    // Append-only, whatever the client: rows can only be inserted.
    await queryRunner.query(
      `CREATE FUNCTION "audit_log_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
       BEGIN
         RAISE EXCEPTION 'audit_log is append-only';
       END
       $$`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "audit_log_no_update_delete" BEFORE UPDATE OR DELETE ON "audit_log"
       FOR EACH ROW EXECUTE FUNCTION "audit_log_append_only"()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "audit_log_no_truncate" BEFORE TRUNCATE ON "audit_log"
       FOR EACH STATEMENT EXECUTE FUNCTION "audit_log_append_only"()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_log"`);
    await queryRunner.query(`DROP FUNCTION "audit_log_append_only"()`);
    await queryRunner.query(`DROP TABLE "admin_sessions"`);
    await queryRunner.query(`DROP TABLE "admin_users"`);
  }
}
