import {
  ADMIN_SPORT_FAMILIES,
  type AdminBusinessBucket,
  type AdminSportFamily,
  type AdminBusinessPeriod,
  type AdminBusinessUnit,
} from '@kilotrace/shared/admin';
import { FAMILY_SPORT_TYPES } from '../../distances/distance-families';
import type { SqlQuery } from '../site-activity/site-activity.sql';
import { periodSeries } from './business-period';

export type { SqlQuery };

/** The period asked for, days in UTC `YYYY-MM-DD`. */
export interface BusinessContext {
  period: AdminBusinessPeriod;
  now: Date;
  /** First day of the period; null for the whole history. */
  from: string | null;
  /** First day of the period before, as long; null for the whole history. */
  previousFrom: string | null;
  /** The day after today: the end of the period, excluded. */
  until: string;
  team: boolean;
}

/** What the section adds to the response, the points of its series included. */
export interface BusinessSeries {
  unit: AdminBusinessUnit;
  buckets: string[];
}

/** Since a day, a null parameter for the whole history. */
export const since = (column: string, param: string) =>
  `(${param}::date IS NULL OR ${column} >= ${param}::date)`;

/** Point of a series holding a timestamp, the parameter telling the unit. */
export const bucketOf = (column: string, unit: string) =>
  `to_char(date_trunc(${unit}::text, ${column} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`;

/**
 * Family of a sport. A literal of the code, never of the request. Some
 * benchmark activities carry capitalized sports: case is ignored.
 */
export const familySql = (sport: string) => {
  const families = Object.entries(FAMILY_SPORT_TYPES)
    .map(
      ([family, types]) =>
        `WHEN lower(${sport}) IN (${types.map((type) => `'${type}'`).join(', ')}) THEN '${family}'`,
    )
    .join(' ');
  return `CASE ${families} ELSE 'other' END`;
};

export const emptyFamilies = () =>
  Object.fromEntries(
    ADMIN_SPORT_FAMILIES.map((family) => [family, 0]),
  ) as Record<AdminSportFamily, number>;

/** The points of a section, whose whole history starts at what `earliestSql` reads, `$1` the team. */
export async function seriesOf(
  query: SqlQuery,
  { period, now, team }: BusinessContext,
  earliestSql: string,
): Promise<BusinessSeries> {
  if (period !== 'all') {
    return periodSeries(period, now, null);
  }
  const [row] = await query<{ earliest: Date | null }>(earliestSql, [team]);
  return periodSeries(period, now, row.earliest);
}

/** One value per point, zero where no row has it. */
export function fillSeries<Row extends { bucket: string }, Value>(
  buckets: string[],
  rows: Row[],
  value: (row: Row) => Value,
  empty: Value,
): Value[] {
  const byBucket = new Map(rows.map((row) => [row.bucket, value(row)]));
  return buckets.map((bucket) => byBucket.get(bucket) ?? empty);
}

/** The ranges of a distribution in their order, zero where no row has them. */
export function fillBuckets(
  buckets: readonly string[],
  rows: AdminBusinessBucket[],
): AdminBusinessBucket[] {
  const byBucket = new Map(rows.map((row) => [row.bucket, row.count]));
  return buckets.map((bucket) => ({
    bucket,
    count: byBucket.get(bucket) ?? 0,
  }));
}
