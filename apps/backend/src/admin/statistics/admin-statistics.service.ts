import {
  ADMIN_SPORT_FAMILIES,
  ADMIN_STATISTICS_DAYS,
  type AdminSportFamily,
  type AdminStatisticsResponse,
  type AdminStravaUsagePoint,
} from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FAMILY_SPORT_TYPES } from '../../distances/distance-families';
import { quarterStart } from '../../strava/api/strava-rate-limiter';
import { DAY_MS, periodDays } from './statistics-period';

const QUARTER_HOUR_MS = 15 * 60 * 1000;
const QUARTERS_PER_DAY = 96;

/** `YYYY-MM-DD` of a date, in UTC. */
const utcDate = (date: Date) => date.toISOString().slice(0, 10);

const emptyFamilies = () =>
  Object.fromEntries(
    ADMIN_SPORT_FAMILIES.map((family) => [family, 0]),
  ) as Record<AdminSportFamily, number>;

interface UsageRow {
  start: Date;
  read: number | null;
  read_limit: number | null;
  overall: number | null;
  overall_limit: number | null;
}

/** One point per slot, empty where no Strava call was made. */
function usagePoints(slots: Date[], rows: UsageRow[]): AdminStravaUsagePoint[] {
  const bySlot = new Map(rows.map((row) => [row.start.getTime(), row]));
  return slots.map((slot) => {
    const row = bySlot.get(slot.getTime());
    return {
      start: slot.toISOString(),
      read: row?.read ?? null,
      readLimit: row?.read_limit ?? null,
      overall: row?.overall ?? null,
      overallLimit: row?.overall_limit ?? null,
    };
  });
}

/** Aggregated figures of the application, without any personal data. */
@Injectable()
export class AdminStatisticsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async statistics(now = new Date()): Promise<AdminStatisticsResponse> {
    const days = periodDays(now);
    const from = days[0];
    const previousFrom = new Date(
      from.getTime() - ADMIN_STATISTICS_DAYS * DAY_MS,
    );
    const quarters = Array.from(
      { length: QUARTERS_PER_DAY },
      (_, index) =>
        new Date(
          quarterStart(now).getTime() -
            (QUARTERS_PER_DAY - 1 - index) * QUARTER_HOUR_MS,
        ),
    );

    const [
      users,
      signups,
      follows,
      activities,
      synced,
      usageDays,
      usageQuarters,
      notifications,
    ] = await Promise.all([
      this.dataSource.query<{ total: number; previous: number }[]>(
        `SELECT count(*)::int AS "total",
             count(*) FILTER (WHERE "created_at" >= $1 AND "created_at" < $2)::int AS "previous"
           FROM "users"`,
        [previousFrom, from],
      ),
      this.dataSource.query<{ date: string; count: number }[]>(
        `SELECT to_char("created_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date", count(*)::int AS "count"
           FROM "users" WHERE "created_at" >= $1 GROUP BY 1`,
        [from],
      ),
      this.dataSource.query<{ accepted: number; pending: number }[]>(
        `SELECT count(*) FILTER (WHERE NOT "pending")::int AS "accepted",
             count(*) FILTER (WHERE "pending")::int AS "pending"
           FROM "follows"`,
      ),
      this.dataSource.query<{ total: number }[]>(
        `SELECT count(*)::int AS "total" FROM "activities"`,
      ),
      this.dataSource.query<
        { date: string; family: AdminSportFamily; count: number }[]
      >(
        `SELECT to_char("created_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date",
             CASE WHEN "sport_type" = ANY($2) THEN 'ride' WHEN "sport_type" = ANY($3) THEN 'run'
               WHEN "sport_type" = ANY($4) THEN 'hike' WHEN "sport_type" = ANY($5) THEN 'swim'
               ELSE 'other' END AS "family",
             count(*)::int AS "count"
           FROM "activities" WHERE "created_at" >= $1 GROUP BY 1, 2`,
        [
          from,
          FAMILY_SPORT_TYPES.ride,
          FAMILY_SPORT_TYPES.run,
          FAMILY_SPORT_TYPES.hike,
          FAMILY_SPORT_TYPES.swim,
        ],
      ),
      // Quarters align on UTC days: the highest of a day is its total.
      this.dataSource.query<UsageRow[]>(
        `SELECT date_trunc('day', "window_start" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS "start",
             max("read_daily_usage") AS "read", max("read_daily_limit") AS "read_limit",
             max("daily_usage") AS "overall", max("daily_limit") AS "overall_limit"
           FROM "strava_api_usage" WHERE "window_start" >= $1 GROUP BY 1`,
        [from],
      ),
      this.dataSource.query<UsageRow[]>(
        `SELECT "window_start" AS "start", "read_short_usage" AS "read", "read_short_limit" AS "read_limit",
             "short_usage" AS "overall", "short_limit" AS "overall_limit"
           FROM "strava_api_usage" WHERE "window_start" >= $1`,
        [quarters[0]],
      ),
      this.dataSource.query<{ read: number; unread: number }[]>(
        `SELECT count(*) FILTER (WHERE "read_at" IS NOT NULL)::int AS "read",
             count(*) FILTER (WHERE "read_at" IS NULL)::int AS "unread"
           FROM "notifications"`,
      ),
    ]);

    const signupsByDate = new Map(signups.map((row) => [row.date, row.count]));
    const syncedByDate = new Map<string, Record<AdminSportFamily, number>>();
    for (const row of synced) {
      const families = syncedByDate.get(row.date) ?? emptyFamilies();
      families[row.family] += row.count;
      syncedByDate.set(row.date, families);
    }

    return {
      generatedAt: now.toISOString(),
      users: {
        total: users[0].total,
        signups: days.map((day) => ({
          date: utcDate(day),
          count: signupsByDate.get(utcDate(day)) ?? 0,
        })),
        previousSignups: users[0].previous,
      },
      follows: follows[0],
      activities: {
        total: activities[0].total,
        synced: days.map((day) => ({
          date: utcDate(day),
          families: syncedByDate.get(utcDate(day)) ?? emptyFamilies(),
        })),
      },
      stravaUsage: {
        days: usagePoints(days, usageDays),
        quarters: usagePoints(quarters, usageQuarters),
      },
      notifications: notifications[0],
    };
  }
}
