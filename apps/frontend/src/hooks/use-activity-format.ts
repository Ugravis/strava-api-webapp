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
      /** Average speed over the moving time, in km/h. */
      speed: (meters: number, seconds: number) =>
        format.number(seconds > 0 ? (meters / seconds) * 3.6 : 0, {
          style: "unit",
          unit: "kilometer-per-hour",
          maximumFractionDigits: 1,
        }),
      /** Average pace over the moving time, as minutes and seconds per kilometer. */
      pace: (meters: number, seconds: number) => {
        const perKm = meters > 0 ? Math.round((seconds / meters) * 1000) : 0;
        return t("pace", { minutes: Math.floor(perKm / 60), seconds: String(perKm % 60).padStart(2, "0") });
      },
      elevation: (meters: number) =>
        format.number(meters, { style: "unit", unit: "meter", maximumFractionDigits: 0 }),
      date: (value: string) => format.dateTime(new Date(value), { dateStyle: "medium" }),
    }),
    [t, tSport, format],
  );
}

/** Sports on foot, whose speed reads as a pace. */
const FOOT_SPORTS = new Set(["run", "trail_run", "virtual_run", "walk", "hike"]);

export const isFootSport = (sportType: string) => FOOT_SPORTS.has(sportType);

/** Address of an activity on Strava. */
export const stravaActivityUrl = (id: string) => `https://www.strava.com/activities/${id}`;
