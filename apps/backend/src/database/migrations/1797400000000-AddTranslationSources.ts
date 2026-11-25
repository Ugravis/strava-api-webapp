import { MigrationInterface, QueryRunner } from 'typeorm';

/** The source of each translated field of a row, as `jsonb_object_agg` builds it from its translations. */
const sourcesOf = (columns: Record<string, string>) =>
  `COALESCE((SELECT jsonb_object_agg(l.key, (SELECT jsonb_object_agg(f.key, CASE f.key ${Object.entries(
    columns,
  )
    .map(([field, column]) => `WHEN '${field}' THEN to_jsonb(btrim(${column}))`)
    .join(
      ' ',
    )} END) FROM jsonb_each(l.value) f)) FROM jsonb_each(translations) l), '{}')`;

/**
 * The French each translation was made from, so that the back office tells
 * the ones whose source changed since. The translations already there are
 * taken as following their source as it is now.
 */
export class AddTranslationSources1797400000000 implements MigrationInterface {
  name = 'AddTranslationSources1797400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables: [string, Record<string, string>][] = [
      ['badges', { name: 'name', description: 'description' }],
      ['badge_themes', { name: 'name' }],
      ['user_tags', { name: 'name', description: 'description' }],
    ];
    for (const [table, columns] of tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD "translation_sources" jsonb NOT NULL DEFAULT '{}'`,
      );
      await queryRunner.query(
        `UPDATE "${table}" SET "translation_sources" = ${sourcesOf(columns)}`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "release_note_translations" ADD "sources" jsonb NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `UPDATE "release_note_translations" t SET "sources" = jsonb_strip_nulls(jsonb_build_object(
         'title', CASE WHEN t.title IS NOT NULL THEN btrim(n.title) END,
         'summary', CASE WHEN t.summary IS NOT NULL THEN btrim(n.summary) END,
         'new', CASE WHEN t.section_new IS NOT NULL THEN btrim(n.section_new) END,
         'improved', CASE WHEN t.section_improved IS NOT NULL THEN btrim(n.section_improved) END,
         'fixed', CASE WHEN t.section_fixed IS NOT NULL THEN btrim(n.section_fixed) END,
         'other', CASE WHEN t.section_other IS NOT NULL THEN btrim(n.section_other) END))
       FROM "release_notes" n WHERE n.version = t.version`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "release_note_translations" DROP COLUMN "sources"`,
    );
    for (const table of ['badges', 'badge_themes', 'user_tags']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN "translation_sources"`,
      );
    }
  }
}
