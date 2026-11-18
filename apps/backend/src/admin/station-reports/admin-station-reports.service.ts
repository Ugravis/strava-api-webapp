import {
  STATION_REPORT_CUSTOM_DISMISSAL,
  type StationReportDismissal,
} from '@kilotrace/shared';
import type {
  AdminRelatedStationReports,
  AdminStationReport,
  AdminStationReportsOverview,
} from '@kilotrace/shared/admin';
import {
  mapTablePage,
  type TablePage,
  type TableQuery,
} from '@kilotrace/shared/table';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Not, Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { NotificationsService } from '../../notifications/notifications.service';
import { StationReport } from '../../reports/station-report.entity';
import { User } from '../../users/user.entity';
import { toAuditUser } from '../common/audit-user';
import { runTableQuery, type TableSpec } from '../common/table-query';

const DAY_MS = 86_400_000;
const RELATED_PAGE_SIZE = 5;

const REPORTS_TABLE: TableSpec = {
  search: [
    'report.station_name',
    'reporter.username',
    'report.details',
    'CAST(report.id AS text)',
  ],
  sorts: {
    station: 'report.station_name',
    status: `CASE report.status WHEN 'open' THEN 0 WHEN 'accepted' THEN 1 WHEN 'done' THEN 2 ELSE 3 END`,
    reason: 'report.reason',
    details: 'report.details',
    reporter: 'reporter.username',
    createdAt: 'report.created_at',
    resolvedAt: 'report.resolved_at',
    completedAt: 'report.completed_at',
  },
  tiebreak: 'report.id',
  facets: {
    status: { column: 'report.status' },
    reason: { column: 'report.reason' },
    dismissal: { column: 'report.dismissal' },
  },
  groupings: {
    status: 'report.status',
    reason: 'report.reason',
    station: `COALESCE(report.station_name, '')`,
  },
};

/**
 * Decisions on the reports of the railway data, each told to its author with
 * the note of the team: dismissed, or accepted then done once the change is
 * live. A report decides alone, never the others on its station.
 */
@Injectable()
export class AdminStationReportsService {
  constructor(
    @InjectRepository(StationReport)
    private readonly reports: Repository<StationReport>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  async table(query: TableQuery): Promise<TablePage<AdminStationReport>> {
    const base = this.reports
      .createQueryBuilder('report')
      .leftJoin(User, 'reporter', 'reporter.id = report.reporter_id');
    const page = await runTableQuery(base, query, REPORTS_TABLE);
    return mapTablePage(page, (reports) => this.rows(reports));
  }

  async overview(): Promise<AdminStationReportsOverview> {
    const [open, openToday] = await Promise.all([
      this.reports.countBy({ status: 'open' }),
      this.reports.countBy({
        status: 'open',
        createdAt: MoreThan(new Date(Date.now() - DAY_MS)),
      }),
    ]);
    return { open, openToday };
  }

  async detail(id: string): Promise<AdminStationReport> {
    const [row] = await this.rows([await this.find(id)]);
    return row;
  }

  async related(
    id: string,
    offset: number,
  ): Promise<AdminRelatedStationReports> {
    const { placeId } = await this.find(id);
    if (placeId === null) {
      return { reports: [], total: 0 };
    }
    const [reports, total] = await this.reports.findAndCount({
      where: { placeId, id: Not(id) },
      order: { createdAt: 'DESC', id: 'ASC' },
      skip: offset,
      take: RELATED_PAGE_SIZE,
    });
    return { reports: await this.rows(reports), total };
  }

  async accept(actor: User, id: string, note: string | null): Promise<void> {
    const report = await this.findIn(id, 'open');
    await this.reports.update(report.id, {
      status: 'accepted',
      resolvedById: actor.id,
      resolutionNote: note,
      resolvedAt: new Date(),
    });
    await this.tell(report, 'accepted', note);
  }

  async dismiss(
    actor: User,
    id: string,
    dismissal: StationReportDismissal,
    note: string | null,
  ): Promise<void> {
    if (dismissal === STATION_REPORT_CUSTOM_DISMISSAL && !note) {
      throw ApiErrors.badRequest(
        ApiErrorCode.ReasonRequired,
        'A custom dismissal must be told',
      );
    }
    const report = await this.findIn(id, 'open');
    await this.reports.update(report.id, {
      status: 'dismissed',
      dismissal,
      resolvedById: actor.id,
      resolutionNote: note,
      resolvedAt: new Date(),
    });
    await this.tell(report, 'dismissed', note, dismissal);
  }

  /** The change asked by an accepted report is live: its author is told. */
  async complete(actor: User, id: string, note: string | null): Promise<void> {
    const report = await this.findIn(id, 'accepted');
    await this.reports.update(report.id, {
      status: 'done',
      completedById: actor.id,
      completionNote: note,
      completedAt: new Date(),
    });
    await this.tell(report, 'done', note);
  }

  private async tell(
    { reporterId, stationName }: StationReport,
    outcome: 'accepted' | 'dismissed' | 'done',
    note: string | null,
    dismissal?: StationReportDismissal,
  ): Promise<void> {
    if (!reporterId) return;
    await this.notifications.notifyFromTeam(
      reporterId,
      'station_report_closed',
      {
        station: stationName,
        outcome,
        ...(dismissal && { dismissal }),
        ...(note && { reason: note }),
      },
    );
  }

  private async find(id: string): Promise<StationReport> {
    const report = await this.reports.findOneBy({ id });
    if (!report) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'Report not found');
    }
    return report;
  }

  /** The report, refused unless at the step of the decision. */
  private async findIn(
    id: string,
    status: 'open' | 'accepted',
  ): Promise<StationReport> {
    const report = await this.find(id);
    if (report.status !== status) {
      throw ApiErrors.conflict(
        ApiErrorCode.ReportClosed,
        'This report is already decided',
      );
    }
    return report;
  }

  /** The reports with their people, all read at once. */
  private async rows(reports: StationReport[]): Promise<AdminStationReport[]> {
    const ids = [
      ...new Set(
        reports.flatMap(({ reporterId, resolvedById, completedById }) =>
          [reporterId, resolvedById, completedById].filter(
            (id): id is string => id !== null,
          ),
        ),
      ),
    ];
    const users = new Map(
      ids.length
        ? (await this.users.findBy({ id: In(ids) })).map((user) => [
            user.id,
            user,
          ])
        : [],
    );
    const person = (id: string | null) =>
      id ? toAuditUser(id, users.get(id)) : null;
    return reports.map((report) => ({
      id: report.id,
      status: report.status,
      reason: report.reason,
      details: report.details,
      stationId: report.placeId === null ? null : String(report.placeId),
      stationName: report.stationName,
      reporter: person(report.reporterId),
      createdAt: report.createdAt.toISOString(),
      resolver: person(report.resolvedById),
      dismissal: report.dismissal,
      resolutionNote: report.resolutionNote,
      resolvedAt: report.resolvedAt?.toISOString() ?? null,
      completer: person(report.completedById),
      completionNote: report.completionNote,
      completedAt: report.completedAt?.toISOString() ?? null,
    }));
  }
}
