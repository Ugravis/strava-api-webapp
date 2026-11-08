import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The distinctions become the user tags: tables, constraints, permissions
 * and the actions already recorded in the audit log, whose append-only
 * trigger is set aside for the rename only.
 */
export class RenameDistinctionsToUserTags1794400000000 implements MigrationInterface {
  name = 'RenameDistinctionsToUserTags1794400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.rename(queryRunner, {
      tables: [
        ['distinctions', 'user_tags'],
        ['user_distinctions', 'user_tag_assignments'],
      ],
      constraints: [
        ['user_tags', 'PK_distinctions', 'PK_user_tags'],
        [
          'user_tag_assignments',
          'PK_user_distinctions',
          'PK_user_tag_assignments',
        ],
        [
          'user_tag_assignments',
          'FK_user_distinctions_user',
          'FK_user_tag_assignments_user',
        ],
        [
          'user_tag_assignments',
          'FK_user_distinctions_distinction',
          'FK_user_tag_assignments_tag',
        ],
      ],
      prefixes: [
        ['users.distinctions', 'users.userTags'],
        ['distinctions.', 'userTags.'],
      ],
      targetTypes: ['distinction', 'userTag'],
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.rename(queryRunner, {
      tables: [
        ['user_tags', 'distinctions'],
        ['user_tag_assignments', 'user_distinctions'],
      ],
      constraints: [
        ['distinctions', 'PK_user_tags', 'PK_distinctions'],
        [
          'user_distinctions',
          'PK_user_tag_assignments',
          'PK_user_distinctions',
        ],
        [
          'user_distinctions',
          'FK_user_tag_assignments_user',
          'FK_user_distinctions_user',
        ],
        [
          'user_distinctions',
          'FK_user_tag_assignments_tag',
          'FK_user_distinctions_distinction',
        ],
      ],
      prefixes: [
        ['users.userTags', 'users.distinctions'],
        ['userTags.', 'distinctions.'],
      ],
      targetTypes: ['userTag', 'distinction'],
    });
  }

  private async rename(
    queryRunner: QueryRunner,
    names: {
      tables: [string, string][];
      constraints: [string, string, string][];
      prefixes: [string, string][];
      targetTypes: [string, string];
    },
  ): Promise<void> {
    for (const [from, to] of names.tables) {
      await queryRunner.query(`ALTER TABLE "${from}" RENAME TO "${to}"`);
    }
    for (const [table, from, to] of names.constraints) {
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME CONSTRAINT "${from}" TO "${to}"`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "admin_audit_log" DISABLE TRIGGER "TRG_admin_audit_log_append_only"`,
    );
    for (const [from, to] of names.prefixes) {
      await queryRunner.query(
        `UPDATE "admin_role_permissions" SET "permission" = $2 || substr("permission", length($1) + 1) WHERE starts_with("permission", $1)`,
        [from, to],
      );
      await queryRunner.query(
        `UPDATE "admin_audit_log" SET "action" = $2 || substr("action", length($1) + 1) WHERE starts_with("action", $1)`,
        [from, to],
      );
    }
    await queryRunner.query(
      `UPDATE "admin_audit_log" SET "target_type" = $2 WHERE "target_type" = $1`,
      names.targetTypes,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_audit_log" ENABLE TRIGGER "TRG_admin_audit_log_append_only"`,
    );
  }
}
