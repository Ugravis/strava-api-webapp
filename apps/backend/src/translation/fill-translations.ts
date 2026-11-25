import 'reflect-metadata';
import {
  BADGE_THEME_TRANSLATED_FIELDS,
  BADGE_TRANSLATED_FIELDS,
  USER_TAG_TRANSLATED_FIELDS,
} from '@kilotrace/shared/admin';
import { RELEASE_NOTE_TRANSLATED_FIELDS } from '@kilotrace/shared';
import { fillTranslations } from '../common/translations';
import translationConfig from '../config/translation.config';
import dataSource from '../database/data-source';
import { BadgeTheme } from '../distances/badge-theme.entity';
import { Badge } from '../distances/badge.entity';
import { ReleaseNote } from '../release-notes/release-note.entity';
import {
  loadReleaseNoteTranslations,
  replaceReleaseNoteTranslations,
  translatedSourceOf,
} from '../release-notes/release-note-translations';
import { UserTag } from '../users/user-tag.entity';
import { TranslationService } from './translation.service';

/**
 * Fills every field left empty in every language of the content of the team
 * (badges, collections, user tags, release notes) through DeepL, those typed
 * by hand kept: what « Traduire les manquantes » does, for every row at once.
 * `pnpm --filter backend translations:fill`; in production,
 * `node dist/translation/fill-translations.js` in the backend container.
 */
async function main(): Promise<void> {
  const translation = new TranslationService(translationConfig());
  if (!translation.enabled) throw new Error('DEEPL_API_KEY is not set');
  await dataSource.initialize();
  const manager = dataSource.manager;
  const counts: Record<string, number> = {};
  try {
    for (const badge of await manager.find(Badge)) {
      const { translations, filled } = await fillTranslations(
        translation,
        badge,
        badge.translations,
        BADGE_TRANSLATED_FIELDS,
      );
      if (filled) await manager.update(Badge, badge.id, { translations });
      counts.badges = (counts.badges ?? 0) + filled;
    }
    for (const theme of await manager.find(BadgeTheme)) {
      const { translations, filled } = await fillTranslations(
        translation,
        theme,
        theme.translations,
        BADGE_THEME_TRANSLATED_FIELDS,
      );
      if (filled) await manager.update(BadgeTheme, theme.id, { translations });
      counts.collections = (counts.collections ?? 0) + filled;
    }
    for (const tag of await manager.find(UserTag)) {
      const { translations, filled } = await fillTranslations(
        translation,
        tag,
        tag.translations,
        USER_TAG_TRANSLATED_FIELDS,
      );
      if (filled) await manager.update(UserTag, tag.id, { translations });
      counts.tags = (counts.tags ?? 0) + filled;
    }
    for (const note of await manager.find(ReleaseNote)) {
      const { translations, filled } = await fillTranslations(
        translation,
        translatedSourceOf(note),
        await loadReleaseNoteTranslations(manager, note.version),
        RELEASE_NOTE_TRANSLATED_FIELDS,
      );
      if (filled) {
        await manager.transaction((tx) =>
          replaceReleaseNoteTranslations(tx, note.version, translations),
        );
      }
      counts.releaseNotes = (counts.releaseNotes ?? 0) + filled;
    }
  } finally {
    await dataSource.destroy();
  }
  console.log('Fields translated:', counts);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
