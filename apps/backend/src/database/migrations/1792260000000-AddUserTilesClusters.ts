import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTilesClusters1792260000000 implements MigrationInterface {
  name = 'AddUserTilesClusters1792260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_tiles" ADD "cluster_mask" bigint NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tiles" ADD "in_cluster" boolean NOT NULL DEFAULT false`,
    );
    // The cluster tiles are written with the next metrics: every user's are
    // computed again.
    await queryRunner.query(
      `UPDATE user_tile_metrics SET version = version + 1, changed_at = now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_tiles" DROP COLUMN "in_cluster"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tiles" DROP COLUMN "cluster_mask"`,
    );
  }
}
