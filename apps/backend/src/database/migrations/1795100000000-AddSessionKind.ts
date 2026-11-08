import { MigrationInterface, QueryRunner } from 'typeorm';

/** Sessions of the back office, on its own host, apart from those of the site. */
export class AddSessionKind1795100000000 implements MigrationInterface {
  name = 'AddSessionKind1795100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD "kind" character varying(16) NOT NULL DEFAULT 'site'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "kind"`);
  }
}
