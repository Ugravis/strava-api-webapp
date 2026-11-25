import { localeAlternates } from "@/lib/i18n/alternates";
import { routes } from "@/config/routes";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";
import { GridBackdrop } from "@kilotrace/ui/components/layout/grid-backdrop";

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "terms" });
  // Indexed in every language: each one canonical, the others told.
  return { title: t("title"), alternates: localeAlternates(locale, routes.terms) };
}

/** Placeholder until the actual terms of use are written. */
export default async function TermsPage({ params }: LocaleProps) {
  await pageLocale(params);
  const t = await getTranslations("terms");

  return (
    <div className="relative isolate flex flex-1 flex-col">
      <GridBackdrop />
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("placeholder")}</p>
      </article>
    </div>
  );
}
