import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDistinctions1793100000000 implements MigrationInterface {
  name = 'AddUserDistinctions1793100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_distinctions" ("user_id" uuid NOT NULL, "kind" character varying(32) NOT NULL, "awarded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_user_distinctions" PRIMARY KEY ("user_id", "kind"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_distinctions" ADD CONSTRAINT "FK_user_distinctions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // The first members so far, joining on the day they signed up.
    await queryRunner.query(
      `INSERT INTO "user_distinctions" ("user_id", "kind", "awarded_at")
       SELECT "id", 'early_member', "created_at" FROM "users"
       ORDER BY "created_at", "id" LIMIT 100`,
    );
    await queryRunner.query(
      `INSERT INTO "user_distinctions" ("user_id", "kind", "awarded_at")
       SELECT "id", "kind", "created_at" FROM "users"
       CROSS JOIN (VALUES ('founder'), ('team')) AS kinds("kind")
       WHERE "username" = 'upennetier'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_distinctions"`);
  }
}
