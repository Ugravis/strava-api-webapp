import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { TracksMap } from "@/components/map/tracks-map";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("map");
  return { title: t("title") };
}

/** The map fills the space beside the sidebar: its title is only read by screen readers. */
export default function MapPage() {
  const t = useTranslations("map");

  return (
    <div className="flex w-full flex-1 flex-col">
      <h1 className="sr-only">{t("title")}</h1>
      <TracksMap />
    </div>
  );
}
