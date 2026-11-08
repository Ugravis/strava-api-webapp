import { MigrationInterface, QueryRunner } from 'typeorm';

/** Switch of the showcase of the profiles, set from the maintenance page. */
export class AddProfileShowcaseSwitch1795000000000 implements MigrationInterface {
  name = 'AddProfileShowcaseSwitch1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "system_settings" ADD "profile_showcase_enabled" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "system_settings" DROP COLUMN "profile_showcase_enabled"`,
    );
  }
}
