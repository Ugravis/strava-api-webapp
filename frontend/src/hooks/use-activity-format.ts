"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";

/** Formatters of the figures of an activity, in the language of the user. */
export function useActivityFormat() {
  const t = useTranslations("map.activityFormat");
  const tSport = useTranslations("map.sports");
  const format = useFormatter();

  return useMemo(
    () => ({
      // Unknown to this version of the app: shown as "other".
      sport: (sportType: string) => (tSport.has(sportType) ? tSport(sportType) : tSport("other")),
      distance: (meters: number) =>
        format.number(meters / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 }),
      duration: (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return hours > 0
          ? t("hours", { hours, minutes: String(minutes).padStart(2, "0") })
          : t("minutes", { minutes });
      },
      elevation: (meters: number) =>
        format.number(meters, { style: "unit", unit: "meter", maximumFractionDigits: 0 }),
      date: (value: string) => format.dateTime(new Date(value), { dateStyle: "medium" }),
    }),
    [t, tSport, format],
  );
}

/** Address of an activity on Strava. */
export const stravaActivityUrl = (id: string) => `https://www.strava.com/activities/${id}`;
