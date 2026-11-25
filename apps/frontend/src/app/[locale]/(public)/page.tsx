import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { ProgressPreview } from "@/components/landing/progress-preview";
import { SportsBand } from "@/components/landing/sports-band";
import { Steps } from "@/components/landing/steps";
import { StructuredData } from "@/components/landing/structured-data";
import { siteConfig } from "@kilotrace/ui/config/site";
import { OPEN_GRAPH_LOCALES } from "@kilotrace/ui/i18n/locale";
import { localeAlternates, localizedPath } from "@/lib/i18n/alternates";

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: { absolute: t("title") },
    alternates: localeAlternates(locale, "/"),
    openGraph: { type: "website", url: localizedPath(locale, "/"), title: t("title"), description: t("description"), siteName: siteConfig.name, locale: OPEN_GRAPH_LOCALES[locale] },
  };
}

export default async function LandingPage({ params }: LocaleProps) {
  await pageLocale(params);
  return (
    <>
      <StructuredData />
      <Hero />
      <SportsBand />
      <Features />
      <Steps />
      <ProgressPreview />
      <Faq />
      <FinalCta />
    </>
  );
}
