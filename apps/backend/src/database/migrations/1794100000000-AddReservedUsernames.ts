import { MigrationInterface, QueryRunner } from 'typeorm';

/** The former hardcoded list, now managed from the back office. */
const INITIAL_USERNAMES = [
  'admin',
  'administrator',
  'api',
  'help',
  'login',
  'logout',
  'me',
  'profile',
  'register',
  'root',
  'settings',
  'support',
  'system',
];

export class AddReservedUsernames1794100000000 implements MigrationInterface {
  name = 'AddReservedUsernames1794100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "reserved_usernames" ("username" character varying(20) NOT NULL, "category" character varying(16) NOT NULL, "note" text, "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_reserved_usernames" PRIMARY KEY ("username"))`,
    );
    await queryRunner.query(
      `INSERT INTO "reserved_usernames" ("username", "category") SELECT unnest($1::varchar[]), 'system'`,
      [INITIAL_USERNAMES],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reserved_usernames"`);
  }
}
