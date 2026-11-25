import { Providers } from "@kilotrace/ui/components/providers";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { DEFAULT_LOCALE } from "@/i18n/request";
import { getAdminTranslations } from "@/lib/admin/messages";
import { fontVariables } from "./fonts";
import "./globals.css";

/**
 * Its fields in the size of its text, 14 px, also on a phone, where Safari
 * would zoom on any field under 16 px as it is focused: kept from it. A
 * pinch still zooms on iOS.
 */
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

/** Never indexed: no robots.txt or sitemap either, which would disclose it. */
export const metadata: Metadata = {
  title: { default: getAdminTranslations("layout")("title"), template: `%s · ${getAdminTranslations("layout")("title")}` },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
