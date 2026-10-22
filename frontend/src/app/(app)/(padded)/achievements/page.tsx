import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AchievementsOverview } from "@/components/distances/achievements-overview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("distances");
  return { title: t("title") };
}

export default function DistancesPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 sm:py-4">
      <AchievementsOverview />
    </div>
  );
}
