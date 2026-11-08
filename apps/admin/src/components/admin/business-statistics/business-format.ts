import "server-only";
import type { AdminBusinessFigure, AdminBusinessUnit } from "@kilotrace/shared/admin";
import { getFormatter, getTranslations } from "next-intl/server";
import { getSiteActivityFormat } from "@/components/admin/site-activity/site-activity-format";
import { getAdminTranslations } from "@/lib/admin/messages";

const utc = (date: string) => new Date(`${date}T00:00:00Z`);

/** Formatters of the business statistics: the site activity's, then points of the series, sizes and sports. */
export async function getBusinessFormat() {
  const [base, format, sports] = await Promise.all([getSiteActivityFormat(), getFormatter(), getTranslations("map.sports")]);
  const t = getAdminTranslations("businessStatistics.units");
  const date = (value: string, options: Pick<Intl.DateTimeFormatOptions, "day" | "month" | "year">) => format.dateTime(utc(value), { timeZone: "UTC", ...options });
  /** Short label of a point, on the axis. */
  const bucket = (unit: AdminBusinessUnit, value: string) => {
    switch (unit) {
      case "day":
      case "week":
        return date(value, { day: "numeric", month: "short" });
      case "month":
        return date(value, { month: "short", year: "2-digit" });
      case "year":
        return date(value, { year: "numeric" });
    }
  };
  /** Full name of a point, in the tooltip. */
  const bucketTitle = (unit: AdminBusinessUnit, value: string) => {
    switch (unit) {
      case "day":
        return base.longDay(value);
      case "week":
        return t("week", { date: date(value, { day: "numeric", month: "long" }) });
      case "month":
        return date(value, { month: "long", year: "numeric" });
      case "year":
        return date(value, { year: "numeric" });
    }
  };
  return {
    ...base,
    bucket,
    bucketTitle,
    km: (meters: number) => `${base.number(meters / 1000)} km`,
    meters: (meters: number) => `${base.number(meters)} m`,
    hours: (seconds: number) => `${base.number(seconds / 3600)} h`,
    /** Trend of a figure for a tile, none for the whole history. */
    trend: ({ current, previous }: AdminBusinessFigure) => {
      if (previous === null) return null;
      const text = base.change(current, previous);
      return text === null ? null : { ratio: current - previous, text };
    },
    sport: (sport: string) => (sports.has(sport) ? sports(sport) : sport.replaceAll("_", " ")),
  };
}

export type BusinessFormat = Awaited<ReturnType<typeof getBusinessFormat>>;

const regions = new Intl.DisplayNames(["fr"], { type: "region" });

/** Name of a country from its ISO code, the code itself when unknown. */
export function regionName(code: string): string {
  try {
    return regions.of(code) ?? code;
  } catch {
    return code;
  }
}
