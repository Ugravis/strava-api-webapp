import type { Locale } from "@kilotrace/ui/i18n/locale";
import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** The address of `path` in `locale`, prefix included when the language needs one. */
export function localizedPath(locale: Locale, path: string): string {
  return getPathname({ locale, href: path });
}

/**
 * Canonical address of a page in `locale`, and its address in every other
 * language for the `hreflang` links; `x-default` leads to the English one.
 */
export function localeAlternates(locale: Locale, path: string): Metadata["alternates"] {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((other) => [other, localizedPath(other, path)]),
  );
  languages["x-default"] = localizedPath(routing.defaultLocale, path);
  return { canonical: localizedPath(locale, path), languages };
}
