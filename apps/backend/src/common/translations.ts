import {
  SOURCE_LOCALE,
  TARGET_LOCALES,
  type TargetLocale,
  type Translations,
  type UpdateTranslationRequest,
} from '@kilotrace/shared';
import type { FieldRules } from '@kilotrace/shared/rules';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { TranslationService } from '../translation/translation.service';
import { ApiErrorCode, ApiErrors } from './api-error';
import { assertRules } from './field-rules';

export class UpdateTranslationDto implements UpdateTranslationRequest {
  @IsIn(TARGET_LOCALES)
  locale!: TargetLocale;

  @IsString()
  @MaxLength(40)
  field!: string;

  @IsOptional()
  @IsString()
  value!: string | null;
}

/**
 * The translations of a content once one field of one language is set, or
 * cleared (null or blank): checked against the rule of its source field.
 */
export function withTranslation<F extends string>(
  current: Translations<F>,
  fields: readonly F[],
  rules: FieldRules<Record<F, string | null>>,
  { locale, field, value }: UpdateTranslationDto,
): Translations<F> {
  if (!(fields as readonly string[]).includes(field)) {
    throw ApiErrors.badRequest(
      ApiErrorCode.InvalidField,
      `${field} is not translated`,
    );
  }
  const text = value?.trim() || null;
  if (text !== null) {
    assertRules(rules, { [field]: text } as Partial<Record<F, string | null>>, {
      partial: true,
    });
  }
  const fieldsOfLocale: Partial<Record<F, string>> = {
    ...current[locale],
  };
  if (text) fieldsOfLocale[field as F] = text;
  else delete fieldsOfLocale[field as F];
  const next: Translations<F> = { ...current, [locale]: fieldsOfLocale };
  if (Object.keys(fieldsOfLocale).length === 0) delete next[locale];
  return next;
}

/**
 * What the content of the team is, told to DeepL with every text of it, in
 * French as the texts are: it reads it best so (a context in English, or
 * French words quoted, left names untranslated).
 */
const APP =
  "Kilotrace, application de sport : les sorties de course, vélo et randonnée importées de Strava colorient les tuiles de la carte, comptent les gares traversées et cumulent les distances. Les membres s'abonnent les uns aux autres comme sur un réseau social.";

export const TRANSLATION_CONTEXTS = {
  badge: `Nom et description d'un badge de ${APP} La plupart des badges récompensent une distance cumulée égale au tour (la circonférence) d'une planète, d'une lune ou de la Terre, ou à une profondeur, une altitude, un nombre.`,
  badgeTheme: `Nom d'une collection regroupant des badges de ${APP}`,
  userTag: `Nom et description d'un insigne affiché sur le profil d'un membre de ${APP}`,
  teamNote: `Message de l'équipe de modération de ${APP} à un membre, par exemple la raison de la réinitialisation de son profil.`,
  releaseNote: `Note de mise à jour d'une nouvelle version de ${APP} En Markdown, mise en forme conservée.`,
} as const;

/**
 * Fills the fields missing in every language from their source through
 * DeepL, those typed by the team kept; refused when it cannot translate.
 */
export async function fillTranslations<F extends string>(
  translation: TranslationService,
  source: Partial<Record<F, string | null>>,
  current: Translations<F>,
  fields: readonly F[],
  context: string,
): Promise<{ translations: Translations<F>; filled: number }> {
  if (!translation.enabled) {
    throw ApiErrors.unavailable(
      ApiErrorCode.TranslationUnavailable,
      'Machine translation is not set up',
    );
  }
  const next: Translations<F> = { ...current };
  let filled = 0;
  for (const locale of TARGET_LOCALES) {
    const missing = fields.filter(
      (field) => source[field]?.trim() && !current[locale]?.[field],
    );
    if (missing.length === 0) continue;
    const texts = await translation.translate(
      missing.map((field) => source[field]!),
      locale,
      { source: SOURCE_LOCALE, context },
    );
    if (!texts) {
      throw ApiErrors.unavailable(
        ApiErrorCode.TranslationUnavailable,
        'Machine translation failed',
      );
    }
    next[locale] = {
      ...current[locale],
      ...Object.fromEntries(missing.map((field, i) => [field, texts[i].text])),
    };
    filled += missing.length;
  }
  return { translations: next, filled };
}
