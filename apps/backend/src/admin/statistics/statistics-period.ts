import { ADMIN_STATISTICS_DAYS } from '@kilotrace/shared/admin';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC midnights of the period, oldest first, today last. */
export function periodDays(now: Date, count = ADMIN_STATISTICS_DAYS): Date[] {
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Array.from(
    { length: count },
    (_, index) => new Date(today - (count - 1 - index) * DAY_MS),
  );
}
