import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileBadges1792700000000 implements MigrationInterface {
  name = 'AddProfileBadges1792700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_profile_badges" ("user_id" uuid NOT NULL, "badge_id" character varying(64) NOT NULL, "added_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_user_profile_badges" PRIMARY KEY ("user_id", "badge_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profile_badges" ADD CONSTRAINT "FK_user_profile_badges_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profile_badges" ADD CONSTRAINT "FK_user_profile_badges_badge" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_profile_badges"`);
  }
}
