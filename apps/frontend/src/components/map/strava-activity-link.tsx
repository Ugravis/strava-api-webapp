"use client";

import { useTranslations } from "next-intl";
import { stravaActivityUrl } from "@/hooks/use-activity-format";

/** "View on Strava", in the orange and weight the Strava brand guidelines ask for. */
export function StravaActivityLink({ stravaId }: { stravaId: string }) {
  const t = useTranslations("map.activityFormat");
  return (
    <a
      href={stravaActivityUrl(stravaId)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-[#fc4c02] hover:underline focus-visible:underline"
    >
      {t("viewOnStrava")}
    </a>
  );
}
