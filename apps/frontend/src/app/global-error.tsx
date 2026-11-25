"use client";

import { ErrorView } from "@kilotrace/ui/components/error/error-view";
import { Providers } from "@kilotrace/ui/components/providers";
import { DEFAULT_LOCALE, TIME_ZONE } from "@kilotrace/ui/i18n/locale";
import errorPages from "@kilotrace/ui/messages/error-pages.fr.json";
import { NextIntlClientProvider } from "next-intl";
import { fontVariables } from "./fonts";
import { routes } from "@/config/routes";
import "./globals.css";

/**
 * An error of the root layout itself, which this page replaces: its own
 * document, with only the texts of the error pages, not the whole catalog.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang={DEFAULT_LOCALE} className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={DEFAULT_LOCALE} timeZone={TIME_ZONE} messages={{ errorPages }}>
          <Providers>
            <ErrorView error={error} reset={reset} homeHref={routes.home} />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
