import { MigrationInterface, QueryRunner } from 'typeorm';

/** The language of the site where a sign-up or a password reset started, that of its emails. */
export class AddEmailChallengeLocale1797200000000 implements MigrationInterface {
  name = 'AddEmailChallengeLocale1797200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_challenges" ADD "locale" character varying(5) NOT NULL DEFAULT 'en'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_challenges" DROP COLUMN "locale"`,
    );
  }
}
