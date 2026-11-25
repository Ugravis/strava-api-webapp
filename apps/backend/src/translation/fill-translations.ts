import 'reflect-metadata';
import {
  BADGE_THEME_TRANSLATED_FIELDS,
  BADGE_TRANSLATED_FIELDS,
  USER_TAG_TRANSLATED_FIELDS,
} from '@kilotrace/shared/admin';
import { RELEASE_NOTE_TRANSLATED_FIELDS } from '@kilotrace/shared';
import {
  columnsOf,
  fillTranslations,
  stateOf,
  TRANSLATION_CONTEXTS,
} from '../common/translations';
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
 * `--all` translates every field again, those typed by hand included.
 * `pnpm --filter backend translations:fill [--all]`; in production,
 * `node dist/translation/fill-translations.js [--all]` in the backend container.
 */
/** Between two rows: DeepL Free answers 429 to a burst of calls. */
const PAUSE_MS = 400;
const pause = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS));

async function main(): Promise<void> {
  const all = process.argv.includes('--all');
  const translation = new TranslationService(translationConfig());
  if (!translation.enabled) throw new Error('DEEPL_API_KEY is not set');
  await dataSource.initialize();
  const manager = dataSource.manager;
  const counts: Record<string, number> = {};
  try {
    for (const badge of await manager.find(Badge)) {
      const { filled, ...state } = await fillTranslations(
        translation,
        badge,
        stateOf(badge),
        BADGE_TRANSLATED_FIELDS,
        TRANSLATION_CONTEXTS.badge,
        all,
      );
      if (filled) await manager.update(Badge, badge.id, columnsOf(state));
      counts.badges = (counts.badges ?? 0) + filled;
      if (filled) await pause();
    }
    for (const theme of await manager.find(BadgeTheme)) {
      const { filled, ...state } = await fillTranslations(
        translation,
        theme,
        stateOf(theme),
        BADGE_THEME_TRANSLATED_FIELDS,
        TRANSLATION_CONTEXTS.badgeTheme,
        all,
      );
      if (filled) await manager.update(BadgeTheme, theme.id, columnsOf(state));
      counts.collections = (counts.collections ?? 0) + filled;
      if (filled) await pause();
    }
    for (const tag of await manager.find(UserTag)) {
      const { filled, ...state } = await fillTranslations(
        translation,
        tag,
        stateOf(tag),
        USER_TAG_TRANSLATED_FIELDS,
        TRANSLATION_CONTEXTS.userTag,
        all,
      );
      if (filled) await manager.update(UserTag, tag.id, columnsOf(state));
      counts.tags = (counts.tags ?? 0) + filled;
      if (filled) await pause();
    }
    for (const note of await manager.find(ReleaseNote)) {
      const { filled, ...state } = await fillTranslations(
        translation,
        translatedSourceOf(note),
        await loadReleaseNoteTranslations(manager, note.version),
        RELEASE_NOTE_TRANSLATED_FIELDS,
        TRANSLATION_CONTEXTS.releaseNote,
        all,
      );
      if (filled) {
        await manager.transaction((tx) =>
          replaceReleaseNoteTranslations(tx, note.version, state),
        );
      }
      counts.releaseNotes = (counts.releaseNotes ?? 0) + filled;
      if (filled) await pause();
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
