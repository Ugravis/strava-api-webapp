import type { Locale } from "@kilotrace/ui/i18n/locale";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

/** Props of a page or layout under the `[locale]` segment. */
export interface LocaleProps {
  params: Promise<{ locale: string }>;
}

/** The language of the page, from its segment, also handed to next-intl so that the page renders statically. */
export async function pageLocale(params: LocaleProps["params"]): Promise<Locale> {
  const { locale } = await params;
  const resolved = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  setRequestLocale(resolved);
  return resolved;
}
