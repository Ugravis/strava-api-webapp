import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";
import { ReleaseNotesHistory } from "@/components/release-notes/release-notes-history";

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const t = await getTranslations({ locale: await pageLocale(params), namespace: "releaseNotes" });
  return { title: t("title") };
}

export default async function ReleaseNotesPage({ params }: LocaleProps) {
  await pageLocale(params);
  const t = await getTranslations("releaseNotes");
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-2 sm:py-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </header>
      <ReleaseNotesHistory />
    </div>
  );
}
