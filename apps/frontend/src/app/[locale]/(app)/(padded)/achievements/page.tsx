import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";
import { AchievementsOverview } from "@/components/distances/achievements-overview";

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const t = await getTranslations({ locale: await pageLocale(params), namespace: "distances" });
  return { title: t("title") };
}

export default async function DistancesPage({ params }: LocaleProps) {
  await pageLocale(params);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 sm:py-4">
      <AchievementsOverview />
    </div>
  );
}
