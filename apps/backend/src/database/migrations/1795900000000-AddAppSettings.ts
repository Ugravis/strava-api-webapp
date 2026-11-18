import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Every setting of the site in one key-value table, `app_settings`: one row
 * per setting changed from the back office, and the maintenance banner
 * under `maintenance`. Replaces `system_settings`; the permissions of the
 * sign-ups and of the showcase become `system.settings`.
 */
export class AddAppSettings1795900000000 implements MigrationInterface {
  name = 'AddAppSettings1795900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "app_settings" (
        "key" varchar(40) NOT NULL,
        "value" jsonb,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_settings" PRIMARY KEY ("key")
      )`,
    );
    // The switches only when off, on being the default; the banner only when shown.
    await queryRunner.query(
      `INSERT INTO "app_settings" ("key", "value", "updated_at")
       SELECT 'signupsEnabled', 'false'::jsonb, "updated_at" FROM "system_settings" WHERE NOT "signups_enabled"
       UNION ALL
       SELECT 'profileShowcaseEnabled', 'false'::jsonb, "updated_at" FROM "system_settings" WHERE NOT "profile_showcase_enabled"
       UNION ALL
       SELECT 'maintenance', jsonb_build_object(
         'title', "maintenance_title",
         'description', "maintenance_description",
         'since', to_char("maintenance_since" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
       ), "updated_at"
       FROM "system_settings" WHERE "maintenance_title" IS NOT NULL AND "maintenance_since" IS NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE "system_settings"`);
    await queryRunner.query(
      `INSERT INTO "admin_role_permissions" ("role", "permission")
       SELECT DISTINCT "role", 'system.settings' FROM "admin_role_permissions"
       WHERE "permission" IN ('system.signups', 'system.showcase')
       ON CONFLICT DO NOTHING`,
    );
    await queryRunner.query(
      `DELETE FROM "admin_role_permissions" WHERE "permission" IN ('system.signups', 'system.showcase')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "admin_role_permissions" ("role", "permission")
       SELECT r."role", p."permission" FROM "admin_role_permissions" r
       CROSS JOIN (VALUES ('system.signups'), ('system.showcase')) AS p("permission")
       WHERE r."permission" = 'system.settings'
       ON CONFLICT DO NOTHING`,
    );
    await queryRunner.query(
      `DELETE FROM "admin_role_permissions" WHERE "permission" = 'system.settings'`,
    );
    await queryRunner.query(
      `CREATE TABLE "system_settings" ("id" smallint NOT NULL, "signups_enabled" boolean NOT NULL DEFAULT true, "profile_showcase_enabled" boolean NOT NULL DEFAULT true, "maintenance_title" character varying(32), "maintenance_description" text, "maintenance_since" TIMESTAMP WITH TIME ZONE, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_system_settings" PRIMARY KEY ("id"), CONSTRAINT "CHK_system_settings_single_row" CHECK ("id" = 1))`,
    );
    await queryRunner.query(
      `INSERT INTO "system_settings" ("id", "signups_enabled", "profile_showcase_enabled", "maintenance_title", "maintenance_description", "maintenance_since")
       SELECT 1,
         NOT EXISTS (SELECT 1 FROM "app_settings" WHERE "key" = 'signupsEnabled' AND "value" = 'false'::jsonb),
         NOT EXISTS (SELECT 1 FROM "app_settings" WHERE "key" = 'profileShowcaseEnabled' AND "value" = 'false'::jsonb),
         m."value" ->> 'title',
         m."value" ->> 'description',
         (m."value" ->> 'since')::timestamptz
       FROM (SELECT 1) AS one
       LEFT JOIN "app_settings" m ON m."key" = 'maintenance'`,
    );
    await queryRunner.query(`DROP TABLE "app_settings"`);
  }
}
