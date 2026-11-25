import {
  RELEASE_NOTE_TRANSLATED_FIELDS,
  type ReleaseNoteTranslatedField,
  type TargetLocale,
  type Translations,
} from '@kilotrace/shared';
import type { EntityManager } from 'typeorm';
import { ReleaseNote } from './release-note.entity';
import { ReleaseNoteTranslation } from './release-note-translation.entity';
import { contentOf } from './release-notes.service';

export type ReleaseNoteTranslations = Translations<ReleaseNoteTranslatedField>;

/** The column of each field translated, in a row of `release_note_translations`. */
export const TRANSLATION_COLUMNS = {
  title: 'title',
  summary: 'summary',
  new: 'sectionNew',
  improved: 'sectionImproved',
  fixed: 'sectionFixed',
  other: 'sectionOther',
} as const satisfies Record<
  ReleaseNoteTranslatedField,
  keyof ReleaseNoteTranslation
>;

/** The translations of each note, from the rows of its languages. */
export function translationsOf(
  rows: ReleaseNoteTranslation[],
): Map<string, ReleaseNoteTranslations> {
  const byVersion = new Map<string, ReleaseNoteTranslations>();
  for (const row of rows) {
    const fields = Object.fromEntries(
      RELEASE_NOTE_TRANSLATED_FIELDS.flatMap((field) => {
        const text = row[TRANSLATION_COLUMNS[field]];
        return text ? [[field, text]] : [];
      }),
    );
    byVersion.set(row.version, {
      ...byVersion.get(row.version),
      [row.locale as TargetLocale]: fields,
    });
  }
  return byVersion;
}

/** The French texts of a note that get translated: every one but the section of the team. */
export function translatedSourceOf(
  note: ReleaseNote,
): Record<ReleaseNoteTranslatedField, string | null> {
  const { title, summary, sections } = contentOf(note);
  const { new: added, improved, fixed, other } = sections;
  return { title, summary, new: added, improved, fixed, other };
}

export async function loadReleaseNoteTranslations(
  manager: EntityManager,
  version: string,
): Promise<ReleaseNoteTranslations> {
  return (
    translationsOf(
      await manager.findBy(ReleaseNoteTranslation, { version }),
    ).get(version) ?? {}
  );
}

/** Every language of a note replaced by `translations`, those left without text removed. */
export async function replaceReleaseNoteTranslations(
  manager: EntityManager,
  version: string,
  translations: ReleaseNoteTranslations,
): Promise<void> {
  await manager.delete(ReleaseNoteTranslation, { version });
  const rows = Object.entries(translations).map(([locale, fields]) => ({
    version,
    locale: locale as TargetLocale,
    ...Object.fromEntries(
      RELEASE_NOTE_TRANSLATED_FIELDS.map((field) => [
        TRANSLATION_COLUMNS[field],
        fields?.[field] ?? null,
      ]),
    ),
  }));
  if (rows.length > 0) await manager.insert(ReleaseNoteTranslation, rows);
}
