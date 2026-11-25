import { MigrationInterface, QueryRunner } from 'typeorm';

/** The time zone the dates of an account are shown in, its browser's; null until a first visit tells it. */
export class AddUserTimeZone1797500000000 implements MigrationInterface {
  name = 'AddUserTimeZone1797500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "time_zone" character varying(64)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "time_zone"`);
  }
}
