import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityGains1792304548899 implements MigrationInterface {
  name = 'AddActivityGains1792304548899';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "activity_gains" ("activity_id" uuid NOT NULL, "user_id" uuid NOT NULL, "gained_tiles" integer array NOT NULL, "gained_subtiles" integer array NOT NULL, "max_cluster_tiles" integer NOT NULL, "other_cluster_tiles" integer NOT NULL, "max_cluster_subtiles" integer NOT NULL, "other_cluster_subtiles" integer NOT NULL, CONSTRAINT "PK_57365bcac6bcfbe93ab918627df" PRIMARY KEY ("activity_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a0001b0b61e455ae8090b9e9a" ON "activity_gains"  ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tile_metrics" ADD "gains_version" bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tile_metrics" ADD "gains_computed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_gains" ADD CONSTRAINT "FK_57365bcac6bcfbe93ab918627df" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activity_gains" DROP CONSTRAINT "FK_57365bcac6bcfbe93ab918627df"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tile_metrics" DROP COLUMN "gains_computed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tile_metrics" DROP COLUMN "gains_version"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a0001b0b61e455ae8090b9e9a"`,
    );
    await queryRunner.query(`DROP TABLE "activity_gains"`);
  }
}
