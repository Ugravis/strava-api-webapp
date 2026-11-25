import { USER_TAG_RULES } from '@kilotrace/shared/admin';
import type { TranslationService } from '../translation/translation.service';
import { fillTranslations, withTranslation } from './translations';

const FIELDS = ['name', 'description'] as const;

describe('withTranslation', () => {
  it('sets a field of a language, the others kept', () => {
    expect(
      withTranslation({ en: { name: 'Founder' } }, FIELDS, USER_TAG_RULES, {
        locale: 'en',
        field: 'description',
        value: ' Was there first ',
      }),
    ).toEqual({ en: { name: 'Founder', description: 'Was there first' } });
  });

  it('removes a language left without text', () => {
    expect(
      withTranslation({ de: { name: 'Gründer' } }, FIELDS, USER_TAG_RULES, {
        locale: 'de',
        field: 'name',
        value: '  ',
      }),
    ).toEqual({});
  });

  it('refuses a field not translated, or breaking the rule of its source', () => {
    const update = (field: string, value: string) => () =>
      withTranslation({}, FIELDS, USER_TAG_RULES, {
        locale: 'it',
        field,
        value,
      });
    expect(update('icon', 'rocket')).toThrow();
    expect(update('name', 'x'.repeat(41))).toThrow();
  });
});

describe('fillTranslations', () => {
  it('translates only the fields missing, from French', async () => {
    const translate = jest.fn((texts: string[], locale: string) =>
      Promise.resolve(
        texts.map((text) => ({
          text: `${locale}:${text}`,
          detectedSource: 'fr',
        })),
      ),
    );
    const service = {
      enabled: true,
      translate,
    } as unknown as TranslationService;

    const result = await fillTranslations(
      service,
      { name: 'Fondateur', description: null },
      { en: { name: 'Founder' } },
      FIELDS,
    );

    expect(result.filled).toBe(3);
    expect(result.translations).toEqual({
      en: { name: 'Founder' },
      it: { name: 'it:Fondateur' },
      es: { name: 'es:Fondateur' },
      de: { name: 'de:Fondateur' },
    });
    expect(translate).toHaveBeenCalledWith(['Fondateur'], 'it', 'fr');
  });

  it('is refused without machine translation', async () => {
    await expect(
      fillTranslations(
        { enabled: false } as TranslationService,
        { name: 'Fondateur' },
        {},
        FIELDS,
      ),
    ).rejects.toThrow('not set up');
  });
});
