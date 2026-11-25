import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  isTargetLocale,
  type Locale,
  SOURCE_LOCALE,
  TARGET_LOCALES,
} from '@kilotrace/shared';
import translationConfig, {
  type TranslationConfig,
} from '../config/translation.config';
import { GLOSSARY } from './glossary';

/** Target languages as DeepL spells them; plain `EN` is deprecated as a target. */
const DEEPL_TARGETS: Record<Locale, string> = {
  en: 'EN-US',
  fr: 'FR',
  it: 'IT',
  es: 'ES',
  de: 'DE',
};

/** Calls to DeepL for one request, the first included. */
const MAX_ATTEMPTS = 5;

/** Prefix of the glossary this app keeps at DeepL, followed by the hash of its entries. */
const GLOSSARY_PREFIX = 'kilotrace-';

export interface Translation {
  text: string;
  /** The language DeepL found the source in, lowercase, e.g. `fr`. */
  detectedSource: string;
}

interface DeepLResponse {
  translations: { detected_source_language: string; text: string }[];
}

interface DeepLGlossary {
  glossary_id: string;
  name: string;
}

/**
 * Machine translation through the DeepL API. Without a key, or when DeepL
 * fails, it answers null and the callers keep the texts as written. From
 * French, the words of the site follow its glossary (`GLOSSARY`).
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private glossary: Promise<string | null> | null = null;

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
    if (!this.enabled || texts.length === 0) return null;
    try {
      const glossary =
        source === SOURCE_LOCALE && isTargetLocale(target)
          ? await this.glossaryId()
          : null;
      const response = await this.call('/v2/translate', {
        method: 'POST',
        body: {
          text: texts,
          target_lang: DEEPL_TARGETS[target],
          ...(source && { source_lang: source.toUpperCase() }),
          ...(context && { context }),
          ...(glossary && { glossary_id: glossary }),
          // The site says « vous » (Sie, Lei, usted): the formal form where the language has one.
          formality: 'prefer_more',
        },
      });
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

  /** The id of the glossary of the site, once per process; null when DeepL refuses it. */
  private glossaryId(): Promise<string | null> {
    if (!this.glossary) {
      this.glossary = this.ensureGlossary().catch((error: unknown) => {
        this.logger.warn(
          `Glossary unavailable, translating without: ${String(error)}`,
        );
        this.glossary = null;
        return null;
      });
    }
    return this.glossary;
  }

  /**
   * A single multilingual glossary (DeepL v3: a free account keeps one), a
   * dictionary from French to each language; named after the hash of its
   * entries, found again or created, the others of the app deleted.
   */
  private async ensureGlossary(): Promise<string> {
    const dictionaries = TARGET_LOCALES.map((target) => ({
      source_lang: SOURCE_LOCALE,
      target_lang: target,
      entries: Object.entries(GLOSSARY[target])
        .map(([from, to]) => `${from}\t${to}`)
        .join('\n'),
      entries_format: 'tsv',
    }));
    const hash = createHash('sha256')
      .update(JSON.stringify(dictionaries))
      .digest('hex')
      .slice(0, 8);
    const name = `${GLOSSARY_PREFIX}${hash}`;
    const { glossaries } = (await (
      await this.call('/v3/glossaries', { method: 'GET' })
    ).json()) as { glossaries: DeepLGlossary[] };
    const kept = glossaries.find((glossary) => glossary.name === name);
    for (const old of glossaries) {
      if (old.name.startsWith(GLOSSARY_PREFIX) && old !== kept) {
        await this.call(`/v3/glossaries/${old.glossary_id}`, {
          method: 'DELETE',
        });
      }
    }
    if (kept) return kept.glossary_id;
    const created = (await (
      await this.call('/v3/glossaries', {
        method: 'POST',
        body: { name, dictionaries },
      })
    ).json()) as DeepLGlossary;
    return created.glossary_id;
  }

  /** A call to DeepL, tried again a little later on too many requests or a fault of DeepL. */
  private async call(
    path: string,
    { method, body }: { method: string; body?: unknown },
  ): Promise<Response> {
    const key = this.config.deeplApiKey!;
    const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
    for (let attempt = 1; ; attempt++) {
      const response = await fetch(`https://${host}${path}`, {
        method,
        headers: {
          Authorization: `DeepL-Auth-Key ${key}`,
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
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
        throw new Error(`DeepL answered ${response.status} to ${path}`);
      }
      return response;
    }
  }
}
