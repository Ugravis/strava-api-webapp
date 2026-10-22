import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { ProgressPreview } from "@/components/landing/progress-preview";
import { SportsBand } from "@/components/landing/sports-band";
import { Steps } from "@/components/landing/steps";
import { StructuredData } from "@/components/landing/structured-data";
import { siteConfig } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: { absolute: t("title") },
    alternates: { canonical: "/" },
    openGraph: { type: "website", url: "/", title: t("title"), description: t("description"), siteName: siteConfig.name, locale: "fr_FR" },
  };
}

export default function LandingPage() {
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
