import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Providers } from "@kilotrace/ui/components/providers";
import { siteConfig } from "@kilotrace/ui/config/site";
import { OPEN_GRAPH_LOCALES } from "@kilotrace/ui/i18n/locale";
import { LocalizedNavigation } from "@/components/navigation-provider";
import { routing } from "@/i18n/routing";
import { fontVariables } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: t("title"), template: `%s · ${siteConfig.name}` },
    description: t("description"),
    keywords: t.raw("keywords") as string[],
    applicationName: siteConfig.name,
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: OPEN_GRAPH_LOCALES[locale],
      alternateLocale: routing.locales.filter((other) => other !== locale).map((other) => OPEN_GRAPH_LOCALES[other]),
      title: t("title"),
      description: t("description"),
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <LocalizedNavigation>
            <Providers>{children}</Providers>
          </LocalizedNavigation>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
