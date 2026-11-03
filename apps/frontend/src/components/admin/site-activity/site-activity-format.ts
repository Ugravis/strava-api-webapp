import "server-only";
import type { AdminRetention } from "@kilotrace/shared/admin";
import { getFormatter } from "next-intl/server";

const utc = (date: string) => new Date(date.length === 7 ? `${date}-01T00:00:00Z` : `${date}T00:00:00Z`);

/** Formatters of the figures of the site activity; days, weeks and months in UTC. */
export async function getSiteActivityFormat() {
  const format = await getFormatter();
  const number = (value: number, digits = 0) => format.number(value, { maximumFractionDigits: digits });
  const percent = (value: number | null, digits = 1) =>
    value === null ? "–" : format.number(value, { style: "percent", maximumFractionDigits: digits });
  /** Change between two figures, signed; none without a base. */
  const change = (current: number, previous: number) =>
    previous > 0 ? format.number((current - previous) / previous, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }) : null;
  const duration = (ms: number | null) => {
    if (ms === null) return "–";
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds} s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ${String(seconds % 60).padStart(2, "0")} s`;
    const hours = Math.floor(minutes / 60);
    if (hours < 100) return `${hours} h ${String(minutes % 60).padStart(2, "0")}`;
    return `${number(hours)} h`;
  };
  const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);
  const rate = ({ retained, eligible }: AdminRetention) => ratio(retained, eligible);
  const day = (date: string) => format.dateTime(utc(date), { timeZone: "UTC", day: "numeric", month: "short" });
  const longDay = (date: string) => format.dateTime(utc(date), { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  const longDate = (date: string) => format.dateTime(utc(date), { timeZone: "UTC", dateStyle: "long" });
  const month = (date: string) => format.dateTime(utc(date), { timeZone: "UTC", month: "short" });
  const longMonth = (date: string) => format.dateTime(utc(date), { timeZone: "UTC", month: "long", year: "numeric" });
  return { number, percent, change, duration, ratio, rate, day, longDay, longDate, month, longMonth };
}

export type SiteActivityFormat = Awaited<ReturnType<typeof getSiteActivityFormat>>;
