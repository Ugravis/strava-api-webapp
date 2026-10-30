/*
 * Formats of the cells, in French and in the time zone of the site. Browser
 * copies of `lib/admin/format.ts`, which is server-only.
 */

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });
const relative = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
const number = new Intl.NumberFormat("fr-FR");
const size = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];
const BYTE_UNITS = ["o", "Ko", "Mo", "Go", "To"];

/** E.g. « 12 mars 2026 ». */
export const formatDate = (iso: string) => date.format(new Date(iso));

/** E.g. « 12 mars 2026, 14:05 ». */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

/** E.g. « 12 480 ». */
export const formatNumber = (value: number) => number.format(value);

/** How long ago, e.g. « il y a 3 jours », in the largest unit reached. */
export function formatRelative(iso: string, now = Date.now()): string {
  const elapsed = new Date(iso).getTime() - now;
  const [unit, length] = UNITS.find(([, each]) => Math.abs(elapsed) >= each) ?? ["minute", 60_000];
  return relative.format(Math.round(elapsed / length), unit);
}

/** A weight of files, e.g. « 1,4 Mo ». */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${size.format(value)} ${BYTE_UNITS[unit]}`;
}
