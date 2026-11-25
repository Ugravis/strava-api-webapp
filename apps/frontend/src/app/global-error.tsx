"use client";

import { ErrorView } from "@kilotrace/ui/components/error/error-view";
import { Providers } from "@kilotrace/ui/components/providers";
import { DEFAULT_LOCALE, isLocale, type Locale, TIME_ZONE } from "@kilotrace/ui/i18n/locale";
import de from "@kilotrace/ui/messages/error-pages.de.json";
import en from "@kilotrace/ui/messages/error-pages.en.json";
import es from "@kilotrace/ui/messages/error-pages.es.json";
import fr from "@kilotrace/ui/messages/error-pages.fr.json";
import it from "@kilotrace/ui/messages/error-pages.it.json";
import { NextIntlClientProvider } from "next-intl";
import { fontVariables } from "./fonts";
import { routes } from "@/config/routes";
import "./globals.css";

/** A few lines per language: all of them stay in this page, which must not load anything more. */
const ERROR_PAGES: Record<Locale, typeof en> = { en, fr, it, es, de };

/** The language of the address, as the site prefixes it; English without a prefix. */
function addressLocale(): Locale {
  const segment = typeof window === "undefined" ? undefined : window.location.pathname.split("/")[1];
  return isLocale(segment) ? segment : DEFAULT_LOCALE;
}

/**
 * An error of the root layout itself, which this page replaces: its own
 * document, with only the texts of the error pages, not the whole catalog.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = addressLocale();
  return (
    <html lang={locale} className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} timeZone={TIME_ZONE} messages={{ errorPages: ERROR_PAGES[locale] }}>
          <Providers>
            <ErrorView error={error} reset={reset} homeHref={routes.home} />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
