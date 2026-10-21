import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { DistancesOverview } from "@/components/distances/distances-overview";
import { PageHeader } from "@/components/layout/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("distances");
  return { title: t("title") };
}

export default function DistancesPage() {
  const t = useTranslations("distances");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-2 sm:py-4">
      <PageHeader title={t("title")} description={t("description")} />
      <DistancesOverview />
    </div>
  );
}
