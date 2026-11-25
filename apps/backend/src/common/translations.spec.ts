import { USER_TAG_RULES } from '@kilotrace/shared/admin';
import type { TranslationService } from '../translation/translation.service';
import { fillTranslations, withTranslation } from './translations';

const FIELDS = ['name', 'description'] as const;
const SOURCE = { name: 'Fondateur', description: 'Était là le premier' };

describe('withTranslation', () => {
  it('sets a field of a language, following its source as it is now', () => {
    expect(
      withTranslation(
        {
          translations: { en: { name: 'Founder' } },
          sources: { en: { name: 'Fondateur' } },
        },
        SOURCE,
        FIELDS,
        USER_TAG_RULES,
        { locale: 'en', field: 'description', value: ' Was there first ' },
      ),
    ).toEqual({
      translations: { en: { name: 'Founder', description: 'Was there first' } },
      sources: {
        en: { name: 'Fondateur', description: 'Était là le premier' },
      },
    });
  });

  it('removes a language left without text, and its sources', () => {
    expect(
      withTranslation(
        {
          translations: { de: { name: 'Gründer' } },
          sources: { de: { name: 'Fondateur' } },
        },
        SOURCE,
        FIELDS,
        USER_TAG_RULES,
        { locale: 'de', field: 'name', value: '  ' },
      ),
    ).toEqual({ translations: {}, sources: {} });
  });

  it('refuses a field not translated, or breaking the rule of its source', () => {
    const update = (field: string, value: string) => () =>
      withTranslation(
        { translations: {}, sources: {} },
        SOURCE,
        FIELDS,
        USER_TAG_RULES,
        { locale: 'it', field, value },
      );
    expect(update('icon', 'rocket')).toThrow();
    expect(update('name', 'x'.repeat(41))).toThrow();
  });
});

describe('fillTranslations', () => {
  const translate = jest.fn((texts: string[], locale: string) =>
    Promise.resolve(
      texts.map((text) => ({
        text: `${locale}:${text}`,
        detectedSource: 'fr',
      })),
    ),
  );
  const service = { enabled: true, translate } as unknown as TranslationService;

  beforeEach(() => translate.mockClear());

  it('translates the fields missing or out of date, those following their source kept', async () => {
    const result = await fillTranslations(
      service,
      { name: 'Fondateur', description: 'Le tout premier' },
      {
        translations: {
          en: { name: 'Founder', description: 'Was there first' },
          it: { name: 'Fondatore' },
          es: { name: 'Fundador' },
          de: { name: 'Gründer' },
        },
        sources: {
          en: { name: 'Fondateur', description: 'Était là le premier' },
          it: { name: 'Fondateur' },
          es: { name: 'Fondateur' },
          de: { name: 'Fondateur' },
        },
      },
      FIELDS,
      'A tag',
    );

    expect(result.filled).toBe(4);
    expect(result.translations.en).toEqual({
      name: 'Founder',
      description: 'en:Le tout premier',
    });
    expect(result.sources.en?.description).toBe('Le tout premier');
    expect(translate).toHaveBeenCalledWith(['Le tout premier'], 'it', {
      source: 'fr',
      context: 'A tag',
    });
  });

  it('translates every field again with `all`', async () => {
    const result = await fillTranslations(
      service,
      { name: 'Fondateur', description: null },
      {
        translations: { en: { name: 'Founder' } },
        sources: { en: { name: 'Fondateur' } },
      },
      FIELDS,
      'A tag',
      true,
    );

    expect(result.filled).toBe(4);
    expect(result.translations.en).toEqual({ name: 'en:Fondateur' });
  });

  it('is refused without machine translation', async () => {
    await expect(
      fillTranslations(
        { enabled: false } as TranslationService,
        SOURCE,
        { translations: {}, sources: {} },
        FIELDS,
        'A tag',
      ),
    ).rejects.toThrow('not set up');
  });
});
