import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The `team` distinction now follows the back-office roles: awarded to the
 * current members. Not undone, since a hand-granted one cannot be told apart.
 */
export class SyncTeamDistinction1794000000000 implements MigrationInterface {
  name = 'SyncTeamDistinction1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "user_distinctions" ("user_id", "kind") SELECT "id", 'team' FROM "users" WHERE cardinality("roles") > 0 ON CONFLICT DO NOTHING`,
    );
  }

  public async down(): Promise<void> {}
}
