import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Translations of the content written by the team, in French: short fields
 * in a JSONB of each row (`{ "en": { "name": "…" } }`), the long texts of the
 * release notes in a table of their own, one row per language.
 */
export class AddContentTranslations1797300000000 implements MigrationInterface {
  name = 'AddContentTranslations1797300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['badges', 'badge_themes', 'user_tags']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD "translations" jsonb NOT NULL DEFAULT '{}'`,
      );
    }
    await queryRunner.query(
      `CREATE TABLE "release_note_translations" ("version" character varying(40) NOT NULL, "locale" character varying(5) NOT NULL, "title" character varying(80), "summary" character varying(240), "section_new" text, "section_improved" text, "section_fixed" text, "section_other" text, CONSTRAINT "PK_release_note_translations" PRIMARY KEY ("version", "locale"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_note_translations" ADD CONSTRAINT "FK_release_note_translations_note" FOREIGN KEY ("version") REFERENCES "release_notes"("version") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "release_note_translations"`);
    for (const table of ['badges', 'badge_themes', 'user_tags']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN "translations"`,
      );
    }
  }
}
