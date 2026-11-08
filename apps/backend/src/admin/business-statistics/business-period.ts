import type {
  AdminBusinessPeriod,
  AdminBusinessUnit,
} from '@kilotrace/shared/admin';
import { DAY_MS } from '../statistics/statistics-period';

/** Beyond that span, the whole history is read year by year. */
const MONTHLY_DAYS_MAX = 3 * 366;

/** `YYYY-MM-DD` of a date, in UTC. */
export const utcDate = (date: Date) => date.toISOString().slice(0, 10);

/** Start, in UTC, of the unit holding a date; weeks start on Monday. */
export function unitStart(date: Date, unit: AdminBusinessUnit): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  switch (unit) {
    case 'day':
      return new Date(Date.UTC(year, month, day));
    case 'week':
      return new Date(
        Date.UTC(year, month, day - ((date.getUTCDay() + 6) % 7)),
      );
    case 'month':
      return new Date(Date.UTC(year, month));
    case 'year':
      return new Date(Date.UTC(year, 0));
  }
}

function nextStart(start: Date, unit: AdminBusinessUnit): Date {
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();
  switch (unit) {
    case 'day':
      return new Date(Date.UTC(year, month, day + 1));
    case 'week':
      return new Date(Date.UTC(year, month, day + 7));
    case 'month':
      return new Date(Date.UTC(year, month + 1));
    case 'year':
      return new Date(Date.UTC(year + 1, 0));
  }
}

/** First day of a period and of the one before; none for the whole history. */
export function periodStart(period: AdminBusinessPeriod, now: Date) {
  if (period === 'all') {
    return { from: null, previousFrom: null };
  }
  const days = Number(period);
  const today = unitStart(now, 'day').getTime();
  return {
    from: utcDate(new Date(today - (days - 1) * DAY_MS)),
    previousFrom: utcDate(new Date(today - (2 * days - 1) * DAY_MS)),
  };
}

/**
 * Whole points of the series of a period, today's last: the first one may
 * start before the period. The whole history starts from `earliest`, the
 * first figure of the series, and has at least today's point.
 */
export function periodSeries(
  period: AdminBusinessPeriod,
  now: Date,
  earliest: Date | null,
): { unit: AdminBusinessUnit; buckets: string[] } {
  const { from } = periodStart(period, now);
  const start = from ? new Date(from) : (earliest ?? now);
  const unit: AdminBusinessUnit =
    period === '30'
      ? 'day'
      : period === '90'
        ? 'week'
        : period === '365'
          ? 'month'
          : now.getTime() - start.getTime() > MONTHLY_DAYS_MAX * DAY_MS
            ? 'year'
            : 'month';
  const buckets: string[] = [];
  for (let at = unitStart(start, unit); at <= now; at = nextStart(at, unit)) {
    buckets.push(utcDate(at));
  }
  return { unit, buckets };
}
