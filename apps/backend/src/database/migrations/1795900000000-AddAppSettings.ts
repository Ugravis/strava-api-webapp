import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The settings of the site, one row per setting changed from the back
 * office. The switches of the sign-ups and of the showcase of the profiles
 * move there, off `system_settings`, which keeps the maintenance banner;
 * their two permissions become `system.settings`.
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
    // Only the switches turned off: on is the default.
    await queryRunner.query(
      `INSERT INTO "app_settings" ("key", "value", "updated_at")
       SELECT 'signupsEnabled', 'false'::jsonb, "updated_at" FROM "system_settings" WHERE NOT "signups_enabled"
       UNION ALL
       SELECT 'profileShowcaseEnabled', 'false'::jsonb, "updated_at" FROM "system_settings" WHERE NOT "profile_showcase_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_settings" DROP COLUMN "signups_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_settings" DROP COLUMN "profile_showcase_enabled"`,
    );
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
       SELECT "role", p.permission FROM "admin_role_permissions"
       CROSS JOIN (VALUES ('system.signups'), ('system.showcase')) AS p(permission)
       WHERE "permission" = 'system.settings'
       ON CONFLICT DO NOTHING`,
    );
    await queryRunner.query(
      `DELETE FROM "admin_role_permissions" WHERE "permission" = 'system.settings'`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_settings" ADD "signups_enabled" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_settings" ADD "profile_showcase_enabled" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `UPDATE "system_settings" SET
         "signups_enabled" = COALESCE((SELECT "value" = 'false'::jsonb FROM "app_settings" WHERE "key" = 'signupsEnabled'), false) IS NOT TRUE,
         "profile_showcase_enabled" = COALESCE((SELECT "value" = 'false'::jsonb FROM "app_settings" WHERE "key" = 'profileShowcaseEnabled'), false) IS NOT TRUE`,
    );
    await queryRunner.query(`DROP TABLE "app_settings"`);
  }
}
