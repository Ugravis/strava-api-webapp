import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileColor1793200000000 implements MigrationInterface {
  name = 'AddProfileColor1793200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "profile_color" character varying(7)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profile_color"`);
  }
}
