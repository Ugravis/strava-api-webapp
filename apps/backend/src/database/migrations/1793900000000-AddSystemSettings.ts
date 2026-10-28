import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSystemSettings1793900000000 implements MigrationInterface {
  name = 'AddSystemSettings1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "system_settings" ("id" smallint NOT NULL, "signups_enabled" boolean NOT NULL DEFAULT true, "maintenance_title" character varying(32), "maintenance_description" text, "maintenance_since" TIMESTAMP WITH TIME ZONE, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_system_settings" PRIMARY KEY ("id"), CONSTRAINT "CHK_system_settings_single_row" CHECK ("id" = 1))`,
    );
    await queryRunner.query(`INSERT INTO "system_settings" ("id") VALUES (1)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "system_settings"`);
  }
}
