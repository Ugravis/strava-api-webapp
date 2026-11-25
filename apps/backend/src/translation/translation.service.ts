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

/** Calls to DeepL for one translation, the first included. */
const MAX_ATTEMPTS = 5;

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

  /**
   * The texts in `target`, in order. `source` unknown: detected by DeepL.
   * `context`: what the texts are, which DeepL reads to pick its words
   * without translating it nor billing it (a short name is ambiguous alone).
   */
  async translate(
    texts: string[],
    target: Locale,
    { source, context }: { source?: Locale; context?: string } = {},
  ): Promise<Translation[] | null> {
    const key = this.config.deeplApiKey;
    if (!key || texts.length === 0) return null;
    const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
    const body = JSON.stringify({
      text: texts,
      target_lang: DEEPL_TARGETS[target],
      ...(source && { source_lang: source.toUpperCase() }),
      ...(context && { context }),
    });
    try {
      for (let attempt = 1; ; attempt++) {
        const response = await fetch(`https://${host}/v2/translate`, {
          method: 'POST',
          headers: {
            Authorization: `DeepL-Auth-Key ${key}`,
            'Content-Type': 'application/json',
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        // Too many requests or a fault of DeepL: tried again a little later.
        if (
          (response.status === 429 || response.status >= 500) &&
          attempt < MAX_ATTEMPTS
        ) {
          const retryAfter = Number(response.headers.get('retry-after'));
          const wait = retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500;
          await new Promise((resolve) => setTimeout(resolve, wait));
          continue;
        }
        if (!response.ok) {
          throw new Error(`DeepL answered ${response.status}`);
        }
        const { translations } = (await response.json()) as DeepLResponse;
        return translations.map((translation) => ({
          text: translation.text,
          detectedSource: translation.detected_source_language.toLowerCase(),
        }));
      }
    } catch (error) {
      this.logger.error(
        'Translation failed',
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }
}
