import { Providers } from "@kilotrace/ui/components/providers";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { Barlow, Geist, Geist_Mono } from "next/font/google";
import { DEFAULT_LOCALE } from "@/i18n/request";
import { getAdminTranslations } from "@/lib/admin/messages";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
/** Only the wordmark uses it, so a single weight and style is loaded. */
const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: "800", style: "italic" });

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
      className={`${geistSans.variable} ${geistMono.variable} ${barlow.variable} h-full antialiased`}
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
