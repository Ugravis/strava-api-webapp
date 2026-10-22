import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCountrySectors1792320000000 implements MigrationInterface {
  name = 'AddCountrySectors1792320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "countries" ADD "focus_bounds" geometry(Polygon,3857)`,
    );
    await queryRunner.query(
      `ALTER TABLE "countries" ADD "requested_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "countries" DROP COLUMN "requested_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "countries" DROP COLUMN "focus_bounds"`,
    );
  }
}
