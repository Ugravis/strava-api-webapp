import { MigrationInterface, QueryRunner } from 'typeorm';

/** The permission of the stored files follows them to the database page: `system.uploads` becomes `database.uploads`. */
export class MoveUploadsPermission1796000000000 implements MigrationInterface {
  name = 'MoveUploadsPermission1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "admin_role_permissions" SET "permission" = 'database.uploads' WHERE "permission" = 'system.uploads'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "admin_role_permissions" SET "permission" = 'system.uploads' WHERE "permission" = 'database.uploads'`,
    );
  }
}
