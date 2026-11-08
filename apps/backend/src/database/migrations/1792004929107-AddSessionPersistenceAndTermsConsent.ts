import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionPersistenceAndTermsConsent1792004929107 implements MigrationInterface {
  name = 'AddSessionPersistenceAndTermsConsent1792004929107';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "terms_accepted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD "persistent" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "display_name" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "display_name" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "persistent"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "terms_accepted_at"`,
    );
  }
}
