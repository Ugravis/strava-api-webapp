import { versionSortKey } from '@kilotrace/shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Release notes, second round: versions of Semantic Versioning (pre-releases
 * included, longer, ordered by a sort key), a note renamed while it is a
 * draft (its views follow), a note disabled once published, and a banner.
 */
export class ExtendReleaseNotes1794600000000 implements MigrationInterface {
  name = 'ExtendReleaseNotes1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "release_note_views" DROP CONSTRAINT "FK_release_note_views_note"`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_notes" ALTER COLUMN "version" TYPE character varying(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_note_views" ALTER COLUMN "version" TYPE character varying(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_note_views" ADD CONSTRAINT "FK_release_note_views_note" FOREIGN KEY ("version") REFERENCES "release_notes"("version") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_notes" ADD "version_order" character varying(200) COLLATE "C" NOT NULL DEFAULT ''`,
    );
    const rows = (await queryRunner.query(
      `SELECT "version" FROM "release_notes"`,
    )) as { version: string }[];
    for (const { version } of rows) {
      await queryRunner.query(
        `UPDATE "release_notes" SET "version_order" = $2 WHERE "version" = $1`,
        [version, versionSortKey(version)],
      );
    }
    await queryRunner.query(
      `ALTER TABLE "release_notes" ALTER COLUMN "version_order" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_release_notes_version_order" ON "release_notes" ("version_order")`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_notes" ADD "disabled_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_notes" ADD "banner_key" character varying(200)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "release_notes" DROP COLUMN "banner_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_notes" DROP COLUMN "disabled_at"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_release_notes_version_order"`);
    await queryRunner.query(
      `ALTER TABLE "release_notes" DROP COLUMN "version_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_note_views" DROP CONSTRAINT "FK_release_note_views_note"`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_note_views" ALTER COLUMN "version" TYPE character varying(16)`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_notes" ALTER COLUMN "version" TYPE character varying(16)`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_note_views" ADD CONSTRAINT "FK_release_note_views_note" FOREIGN KEY ("version") REFERENCES "release_notes"("version") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
