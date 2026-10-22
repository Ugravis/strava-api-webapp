import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Barlow, Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { siteConfig } from "@/config/site";
import { DEFAULT_LOCALE } from "@/i18n/request";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Only the wordmark uses it, so a single weight and style is loaded. */
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: "800",
  style: "italic",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: t("title"), template: `%s · ${siteConfig.name}` },
    description: t("description"),
    keywords: t.raw("keywords") as string[],
    applicationName: siteConfig.name,
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: "fr_FR",
      title: t("title"),
      description: t("description"),
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    robots: { index: true, follow: true },
  };
}

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
