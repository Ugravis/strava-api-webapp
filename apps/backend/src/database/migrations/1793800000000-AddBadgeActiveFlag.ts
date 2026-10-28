import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBadgeActiveFlag1793800000000 implements MigrationInterface {
  name = 'AddBadgeActiveFlag1793800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "badges" ADD "active" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "badges" DROP COLUMN "active"`);
  }
}
