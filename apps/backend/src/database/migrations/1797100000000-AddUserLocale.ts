import { MigrationInterface, QueryRunner } from 'typeorm';

/** The language of each account; those created before the site spoke several are French. */
export class AddUserLocale1797100000000 implements MigrationInterface {
  name = 'AddUserLocale1797100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "locale" character varying(5) NOT NULL DEFAULT 'fr'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "locale" SET DEFAULT 'en'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locale"`);
  }
}
