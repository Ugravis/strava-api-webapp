import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityGains1792306802485 implements MigrationInterface {
  name = 'AddActivityGains1792306802485';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activity_gains" ADD "max_square_tiles" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_gains" ADD "max_square_subtiles" integer NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activity_gains" DROP COLUMN "max_square_subtiles"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_gains" DROP COLUMN "max_square_tiles"`,
    );
  }
}
