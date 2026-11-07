import type {
  AdminBusinessMeta,
  AdminBusinessPeriod,
  AdminBusinessResponses,
  AdminBusinessSection,
} from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DAY_MS } from '../statistics/statistics-period';
import { AdminStatisticsService } from '../statistics/admin-statistics.service';
import { businessAccounts } from './business-accounts.query';
import { businessCommunity } from './business-community.query';
import { businessExploration } from './business-exploration.query';
import { businessOverview } from './business-overview.query';
import { periodStart, unitStart, utcDate } from './business-period';
import { businessSports } from './business-sports.query';
import { businessStrava } from './business-strava.query';
import type { BusinessContext, SqlQuery } from './business-statistics.sql';

/**
 * Figures of the product: accounts, sports, exploration, community and the
 * link to Strava. Aggregated, never a figure of one user. Days in UTC.
 */
@Injectable()
export class AdminBusinessStatisticsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly statistics: AdminStatisticsService,
  ) {}

  async section(
    section: AdminBusinessSection,
    period: AdminBusinessPeriod,
    team: boolean,
    now = new Date(),
  ): Promise<AdminBusinessResponses[AdminBusinessSection]> {
    const context: BusinessContext = {
      period,
      now,
      team,
      ...periodStart(period, now),
      until: utcDate(new Date(unitStart(now, 'day').getTime() + DAY_MS)),
    };
    const query: SqlQuery = (sql, params) => this.dataSource.query(sql, params);
    const figures = await this.figures(section, query, context);
    const meta: Pick<AdminBusinessMeta, 'generatedAt' | 'period' | 'team'> = {
      generatedAt: now.toISOString(),
      period,
      team,
    };
    return {
      ...meta,
      ...figures,
    } as AdminBusinessResponses[AdminBusinessSection];
  }

  private figures(
    section: AdminBusinessSection,
    query: SqlQuery,
    context: BusinessContext,
  ) {
    switch (section) {
      case 'overview':
        return businessOverview(query, context);
      case 'accounts':
        return businessAccounts(query, context);
      case 'sports':
        return businessSports(query, context);
      case 'exploration':
        return businessExploration(query, context);
      case 'community':
        return businessCommunity(query, context);
      case 'strava':
        return businessStrava(query, context, this.statistics);
    }
  }
}
