import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBadgePinPositions1792344380981 implements MigrationInterface {
  name = 'AddBadgePinPositions1792344380981';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_badge_pins" ADD "position" integer NOT NULL DEFAULT 0`,
    );
    // Existing pins keep the order they were pinned in.
    await queryRunner.query(`UPDATE "user_badge_pins" p SET "position" = r.rank
            FROM (SELECT user_id, badge_id, row_number() OVER (PARTITION BY user_id ORDER BY pinned_at) AS rank FROM "user_badge_pins") r
            WHERE p.user_id = r.user_id AND p.badge_id = r.badge_id`);
    await queryRunner.query(
      `ALTER TABLE "user_badge_pins" ALTER COLUMN "position" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_badge_pins" DROP COLUMN "position"`,
    );
  }
}
