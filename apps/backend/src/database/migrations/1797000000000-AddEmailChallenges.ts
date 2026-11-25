import { MigrationInterface, QueryRunner } from 'typeorm';

/** Email codes proving an address at sign-up and for a password reset, stored as keyed hashes. */
export class AddEmailChallenges1797000000000 implements MigrationInterface {
  name = 'AddEmailChallenges1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "email_challenge_purpose" AS ENUM ('signup', 'password_reset')`,
    );
    await queryRunner.query(
      `CREATE TABLE "email_challenges" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "purpose" "email_challenge_purpose" NOT NULL,
        "email" character varying(320) NOT NULL,
        "user_id" uuid,
        "username" character varying(20),
        "password_hash" character varying(255),
        "codes" jsonb NOT NULL DEFAULT '[]',
        "failed_attempts" integer NOT NULL DEFAULT 0,
        "send_count" integer NOT NULL DEFAULT 0,
        "send_window_started_at" TIMESTAMP WITH TIME ZONE,
        "last_sent_at" TIMESTAMP WITH TIME ZONE,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_challenges" PRIMARY KEY ("id"),
        CONSTRAINT "FK_email_challenges_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_email_challenges_purpose_email" ON "email_challenges" ("purpose", "email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_challenges_username" ON "email_challenges" ("username")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_challenges_expires_at" ON "email_challenges" ("expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_challenges"`);
    await queryRunner.query(`DROP TYPE "email_challenge_purpose"`);
  }
}
