import "server-only";
import type { AdminRetention } from "@kilotrace/shared/admin";
import { getFormatter } from "next-intl/server";

/** Formatters of the figures of the site activity. */
export async function getSiteActivityFormat() {
  const format = await getFormatter();
  const number = (value: number, digits = 0) => format.number(value, { maximumFractionDigits: digits });
  const percent = (value: number | null) =>
    value === null ? "—" : format.number(value, { style: "percent", maximumFractionDigits: 1 });
  const duration = (ms: number | null) => {
    if (ms === null) return "—";
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds} s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ${String(seconds % 60).padStart(2, "0")} s`;
    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
  };
  const rate = ({ retained, eligible }: AdminRetention) =>
    eligible === 0 ? "—" : `${percent(retained / eligible)} (${retained}/${eligible})`;
  /** `MM-DD` of a `YYYY-MM-DD`, for the axes. */
  const day = (date: string) => date.slice(5);
  return { number, percent, duration, rate, day };
}

export type SiteActivityFormat = Awaited<ReturnType<typeof getSiteActivityFormat>>;
