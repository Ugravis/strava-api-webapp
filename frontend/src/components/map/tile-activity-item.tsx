"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { TileActivity } from "@/lib/api/types";

/** Address of an activity on Strava. */
const stravaActivityUrl = (id: string) => `https://www.strava.com/activities/${id}`;

/** One activity that crossed a tile: its sport, date and figures, and a link to Strava. */
export function TileActivityItem({ activity }: { activity: TileActivity }) {
  const t = useTranslations("map.tileDialog");
  const tSport = useTranslations("map.sports");
  const format = useFormatter();
  const hours = Math.floor(activity.movingTimeS / 3600);
  const minutes = Math.floor((activity.movingTimeS % 3600) / 60);
  const figures = [
    format.number(activity.distanceM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 }),
    hours > 0 ? t("hours", { hours, minutes: String(minutes).padStart(2, "0") }) : t("minutes", { minutes }),
  ];
  if (activity.elevationGainM !== null && activity.elevationGainM >= 1) {
    figures.push(
      `${format.number(activity.elevationGainM, { style: "unit", unit: "meter", maximumFractionDigits: 0 })} D+`,
    );
  }

  return (
    <li className="flex flex-col gap-1 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate font-medium">{activity.name}</p>
        <time dateTime={activity.startedAt} className="shrink-0 text-xs text-muted-foreground">
          {format.dateTime(new Date(activity.startedAt), { dateStyle: "medium" })}
        </time>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <p className="tabular-nums">
          {/* Unknown to this version of the app: shown as "other". */}
          {tSport.has(activity.sportType) ? tSport(activity.sportType) : tSport("other")}
          {figures.map((figure) => (
            <span key={figure}> · {figure}</span>
          ))}
        </p>
        {activity.stravaId && (
          <a
            href={stravaActivityUrl(activity.stravaId)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#fc4c02] hover:underline focus-visible:underline"
          >
            {t("viewOnStrava")}
          </a>
        )}
      </div>
    </li>
  );
}
