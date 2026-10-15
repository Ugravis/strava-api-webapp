import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { TracksMap } from "@/components/map/tracks-map";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("map");
  return { title: t("title") };
}

export default function MapPage() {
  const t = useTranslations("map");

  return (
    <div className="flex w-full flex-1 flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      <TracksMap />
    </div>
  );
}
