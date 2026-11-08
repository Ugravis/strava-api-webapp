import "server-only";

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });

/** A date and time of the back office, in the time zone of the site. */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return date.format(new Date(iso));
}

const relative = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** How long ago, e.g. « il y a 3 jours », in the largest unit reached. */
export function formatRelative(iso: string, now = Date.now()): string {
  const elapsed = new Date(iso).getTime() - now;
  for (const [unit, size] of UNITS) {
    if (Math.abs(elapsed) >= size) {
      return relative.format(Math.round(elapsed / size), unit);
    }
  }
  return relative.format(0, "minute");
}

const BYTE_UNITS = ["o", "Ko", "Mo", "Go", "To"];
const size = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

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
