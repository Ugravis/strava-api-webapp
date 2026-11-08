import { MigrationInterface, QueryRunner } from 'typeorm';

/** The grants of the former minimal roles, now set from the back office. */
const INITIAL_GRANTS = {
  support: [],
  admin: [
    'users.suspend',
    'users.moderate',
    'users.distinctions',
    'users.sessions',
    'users.strava',
    'users.delete',
    'usernames.manage',
    'badges.create',
    'badges.edit',
    'badges.delete',
  ],
};

export class AddAdminRolePermissions1794200000000 implements MigrationInterface {
  name = 'AddAdminRolePermissions1794200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "admin_role_permissions" ("role" character varying(16) NOT NULL, "permission" character varying(40) NOT NULL, CONSTRAINT "PK_admin_role_permissions" PRIMARY KEY ("role", "permission"))`,
    );
    for (const [role, permissions] of Object.entries(INITIAL_GRANTS)) {
      await queryRunner.query(
        `INSERT INTO "admin_role_permissions" ("role", "permission") SELECT $1, unnest($2::varchar[])`,
        [role, permissions],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admin_role_permissions"`);
  }
}
