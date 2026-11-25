import { DEFAULT_LOCALE, type Locale } from "./locale";

export { ADMIN_LOCALE, DEFAULT_LOCALE, isLocale, LOCALES, LOCALE_NAMES, TIME_ZONE, type Locale } from "./locale";

type Messages = { [key: string]: string | string[] | Messages };

/** The catalog of one language, loaded alone so that a page never carries the others. */
async function catalog(locale: Locale): Promise<Messages> {
  const [messages, errorPages] = await Promise.all([
    import(`@kilotrace/ui/messages/${locale}.json`),
    import(`@kilotrace/ui/messages/error-pages.${locale}.json`),
  ]);
  return { ...messages.default, errorPages: errorPages.default };
}

/** Texts not translated yet in `target` are taken from `fallback`. */
function withFallback(target: Messages, fallback: Messages): Messages {
  const merged: Messages = { ...fallback };
  for (const [key, value] of Object.entries(target)) {
    const base = fallback[key];
    merged[key] =
      value && typeof value === "object" && !Array.isArray(value) && base && typeof base === "object" && !Array.isArray(base)
        ? withFallback(value, base)
        : value;
  }
  return merged;
}

/**
 * Texts of the shared components and of the public site, also read by the
 * back office, in `locale`, completed by the default one. The error pages
 * have their own file, which the global error page loads alone.
 */
export async function loadMessages(locale: Locale): Promise<Messages> {
  const messages = await catalog(locale);
  return locale === DEFAULT_LOCALE ? messages : withFallback(messages, await catalog(DEFAULT_LOCALE));
}
