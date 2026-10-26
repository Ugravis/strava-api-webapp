import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileDetailsAndPrivacy1793000000000 implements MigrationInterface {
  name = 'AddProfileDetailsAndPrivacy1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "bio" character varying(160), ADD "city" character varying(60), ADD "favorite_sports" character varying(16) array NOT NULL DEFAULT '{}', ADD "profile_private" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "follows" ADD "pending" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follows_requests" ON "follows" ("followed_id", "created_at") WHERE "pending"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_follows_requests"`);
    await queryRunner.query(`DELETE FROM "follows" WHERE "pending"`);
    await queryRunner.query(`ALTER TABLE "follows" DROP COLUMN "pending"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "profile_private", DROP COLUMN "favorite_sports", DROP COLUMN "city", DROP COLUMN "bio"`,
    );
  }
}
