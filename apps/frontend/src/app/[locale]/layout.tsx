import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Providers } from "@kilotrace/ui/components/providers";
import { siteConfig } from "@kilotrace/ui/config/site";
import { DEFAULT_LOCALE } from "@/i18n/request";
import { fontVariables } from "./fonts";
import "./globals.css";

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
