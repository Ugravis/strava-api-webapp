import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Locale } from '@kilotrace/shared';
import translationConfig, {
  type TranslationConfig,
} from '../config/translation.config';

/** Target languages as DeepL spells them; plain `EN` is deprecated as a target. */
const DEEPL_TARGETS: Record<Locale, string> = {
  en: 'EN-US',
  fr: 'FR',
  it: 'IT',
  es: 'ES',
  de: 'DE',
};

export interface Translation {
  text: string;
  /** The language DeepL found the source in, lowercase, e.g. `fr`. */
  detectedSource: string;
}

interface DeepLResponse {
  translations: { detected_source_language: string; text: string }[];
}

/**
 * Machine translation through the DeepL API. Without a key, or when DeepL
 * fails, it answers null and the callers keep the texts as written.
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(
    @Inject(translationConfig.KEY) private readonly config: TranslationConfig,
  ) {}

  get enabled(): boolean {
    return this.config.deeplApiKey !== null;
  }

  /** The texts in `target`, in order; `source` unknown: detected by DeepL. */
  async translate(
    texts: string[],
    target: Locale,
    source?: Locale,
  ): Promise<Translation[] | null> {
    const key = this.config.deeplApiKey;
    if (!key || texts.length === 0) return null;
    const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
    try {
      const response = await fetch(`https://${host}/v2/translate`, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: texts,
          target_lang: DEEPL_TARGETS[target],
          ...(source && { source_lang: source.toUpperCase() }),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new Error(`DeepL answered ${response.status}`);
      }
      const { translations } = (await response.json()) as DeepLResponse;
      return translations.map((translation) => ({
        text: translation.text,
        detectedSource: translation.detected_source_language.toLowerCase(),
      }));
    } catch (error) {
      this.logger.error(
        'Translation failed',
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }
}
