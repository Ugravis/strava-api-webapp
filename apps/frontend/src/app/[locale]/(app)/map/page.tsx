import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";
import { TracksMap } from "@/components/map/tracks-map";

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const t = await getTranslations({ locale: await pageLocale(params), namespace: "map" });
  return { title: t("title") };
}

/** The map fills the space beside the sidebar: its title is only read by screen readers. */
export default async function MapPage({ params }: LocaleProps) {
  await pageLocale(params);
  const t = await getTranslations("map");

  return (
    <div className="flex w-full flex-1 flex-col">
      <h1 className="sr-only">{t("title")}</h1>
      <TracksMap />
    </div>
  );
}
