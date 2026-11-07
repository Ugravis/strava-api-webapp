import type {
  AdminSiteActivityMeta,
  AdminSiteActivityPeriod,
  AdminSiteActivityResponses,
  AdminSiteActivitySection,
} from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DAY_MS, periodDays } from '../statistics/statistics-period';
import { siteActivityFunnel } from './site-activity-funnel.query';
import { siteActivityOverview } from './site-activity-overview.query';
import { siteActivityPages } from './site-activity-pages.query';
import { siteActivityParams } from './site-activity-params.query';
import { siteActivitySessions } from './site-activity-sessions.query';
import { siteActivityUsers } from './site-activity-users.query';
import type { SiteActivityContext, SqlQuery } from './site-activity.sql';

/** `YYYY-MM-DD` of a date, in UTC. */
const utcDate = (date: Date) => date.toISOString().slice(0, 10);

const SECTIONS: {
  [Section in AdminSiteActivitySection]: (
    query: SqlQuery,
    context: SiteActivityContext,
  ) => Promise<
    Omit<AdminSiteActivityResponses[Section], keyof AdminSiteActivityMeta>
  >;
} = {
  overview: siteActivityOverview,
  users: siteActivityUsers,
  pages: siteActivityPages,
  sessions: siteActivitySessions,
  params: siteActivityParams,
  funnel: siteActivityFunnel,
};

/**
 * Usage of the site by the signed-in users, aggregated: never a figure of
 * one user. Days and hours in UTC.
 */
@Injectable()
export class AdminSiteActivityService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async section(
    section: AdminSiteActivitySection,
    days: AdminSiteActivityPeriod,
    team: boolean,
    admin = true,
    now = new Date(),
  ): Promise<AdminSiteActivityResponses[AdminSiteActivitySection]> {
    const period = periodDays(now, days);
    const dates = period.map(utcDate);
    const context: SiteActivityContext = {
      days,
      from: dates[0],
      previousFrom: utcDate(new Date(period[0].getTime() - days * DAY_MS)),
      today: dates[dates.length - 1],
      until: utcDate(new Date(period[period.length - 1].getTime() + DAY_MS)),
      team,
      admin,
      dates,
    };
    const query: SqlQuery = (sql, params) => this.dataSource.query(sql, params);
    const [[tracked], figures] = await Promise.all([
      query<{ day: string | null }>(
        `SELECT to_char(min("day"), 'YYYY-MM-DD') AS "day" FROM "user_activity"`,
        [],
      ),
      SECTIONS[section](query, context),
    ]);
    return {
      generatedAt: now.toISOString(),
      days,
      team,
      admin,
      trackedSince: tracked.day,
      dates,
      ...figures,
    };
  }
}
