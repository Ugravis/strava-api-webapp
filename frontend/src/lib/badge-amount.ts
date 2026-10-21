import type { BadgeMetric } from "@/lib/api/types";

/** Metrics of the achievements tabs that count what the user achieved, whatever the sport. */
export const CHALLENGE_METRICS: readonly BadgeMetric[] = ["activities", "active_days", "tiles", "subtiles", "stations"];

/** Hours up to which a duration also shows its minutes. */
const MINUTES_BELOW_HOURS = 100;

/** Meters from which an elevation is shown in kilometers. */
const KILOMETERS_FROM_M = 100_000;

/** The number formats amounts need. */
interface NumberOptions {
  style: "unit";
  unit: "kilometer" | "meter" | "hour" | "minute";
  unitDisplay?: "narrow";
  maximumFractionDigits?: number;
}

export interface AmountFormat {
  /** Formats a number as the locale does. */
  number: (value: number, options: NumberOptions) => string;
  /** Formats a count of `metric`, e.g. "3 gares". */
  count: (metric: BadgeMetric, value: number) => string;
}

/** An amount of a metric with its unit: kilometers, hours, meters, or a count with its noun. */
export function formatAmount(format: AmountFormat, metric: BadgeMetric, value: number): string {
  switch (metric) {
    case "distance":
      return format.number(value / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 });
    case "elevation":
      return value >= KILOMETERS_FROM_M
        ? format.number(value / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 })
        : format.number(value, { style: "unit", unit: "meter", maximumFractionDigits: 0 });
    case "time": {
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      const hoursText = format.number(hours, { style: "unit", unit: "hour", unitDisplay: "narrow" });
      if (hours >= MINUTES_BELOW_HOURS || (minutes === 0 && hours > 0)) return hoursText;
      const minutesText = format.number(minutes, { style: "unit", unit: "minute", unitDisplay: "narrow" });
      return hours === 0 ? minutesText : `${hoursText} ${minutesText}`;
    }
    default:
      return format.count(metric, Math.round(value));
  }
}
