import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileLikesAndCountry1793300000000 implements MigrationInterface {
  name = 'AddProfileLikesAndCountry1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "country_code" character(2)`,
    );
    await queryRunner.query(
      `CREATE TABLE "profile_likes" ("user_id" uuid NOT NULL, "profile_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_profile_likes" PRIMARY KEY ("user_id", "profile_id"), CONSTRAINT "CHK_profile_likes_not_self" CHECK ("user_id" <> "profile_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_profile_likes_profile" ON "profile_likes" ("profile_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_likes" ADD CONSTRAINT "FK_profile_likes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_likes" ADD CONSTRAINT "FK_profile_likes_profile" FOREIGN KEY ("profile_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "profile_likes"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "country_code"`);
  }
}
