import type {
  AdminPermission,
  AdminRelatedUserReports,
  AdminUserReport,
  AdminUserReportsOverview,
  UserReportSanction,
  UserReportStatus,
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
import { UserReport } from '../../reports/user-report.entity';
import { User } from '../../users/user.entity';
import { AdminAuditLogService } from '../audit/admin-audit-log.service';
import { toAuditUser } from '../common/audit-user';
import { runTableQuery, type TableSpec } from '../common/table-query';
import { AdminPermissionsService } from '../permissions/admin-permissions.service';
import { AdminUsersService } from '../users/admin-users.service';
import type { SanctionUserReportDto } from './admin-user-reports.dto';

const DAY_MS = 86_400_000;
const RELATED_PAGE_SIZE = 5;

const REPORTS_TABLE: TableSpec = {
  search: [
    'report.target_username',
    'target.username',
    'reporter.username',
    'report.details',
    'CAST(report.id AS text)',
  ],
  sorts: {
    target: 'report.target_username',
    status: `CASE report.status WHEN 'open' THEN 0 WHEN 'sanctioned' THEN 1 ELSE 2 END`,
    reason: 'report.reason',
    details: 'report.details',
    reporter: 'reporter.username',
    createdAt: 'report.created_at',
    resolvedAt: 'report.resolved_at',
  },
  tiebreak: 'report.id',
  facets: {
    status: { column: 'report.status' },
    reason: { column: 'report.reason' },
  },
  groupings: {
    status: 'report.status',
    reason: 'report.reason',
    target: 'report.target_username',
  },
};

/** What a sanction runs on the account, and the permission and audit action it takes. */
const SANCTION_ACTIONS: Partial<
  Record<UserReportSanction, { permission: AdminPermission; action: string }>
> = {
  moderation: { permission: 'users.moderate', action: 'users.moderate' },
  suspension: { permission: 'users.suspend', action: 'users.suspend' },
  deletion: { permission: 'users.delete', action: 'users.delete' },
};

/**
 * Decisions on reports. A sanction applies to the account, so it closes every
 * open report on it; a dismissal only closes its own. Both are final.
 */
@Injectable()
export class AdminUserReportsService {
  constructor(
    @InjectRepository(UserReport)
    private readonly reports: Repository<UserReport>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly accounts: AdminUsersService,
    private readonly permissions: AdminPermissionsService,
    private readonly audit: AdminAuditLogService,
    private readonly notifications: NotificationsService,
  ) {}

  async table(query: TableQuery): Promise<TablePage<AdminUserReport>> {
    const base = this.reports
      .createQueryBuilder('report')
      .leftJoin(User, 'target', 'target.id = report.target_id')
      .leftJoin(User, 'reporter', 'reporter.id = report.reporter_id');
    const page = await runTableQuery(base, query, REPORTS_TABLE);
    return mapTablePage(page, (reports) => this.rows(reports));
  }

  async overview(): Promise<AdminUserReportsOverview> {
    const [open, openToday] = await Promise.all([
      this.reports.countBy({ status: 'open' }),
      this.reports.countBy({
        status: 'open',
        createdAt: MoreThan(new Date(Date.now() - DAY_MS)),
      }),
    ]);
    return { open, openToday };
  }

  async detail(id: string): Promise<AdminUserReport> {
    const [row] = await this.rows([await this.find(id)]);
    return row;
  }

  async related(id: string, offset: number): Promise<AdminRelatedUserReports> {
    const { targetId } = await this.find(id);
    if (!targetId) {
      return { reports: [], total: 0 };
    }
    const [reports, total] = await this.reports.findAndCount({
      where: { targetId, id: Not(id) },
      order: { createdAt: 'DESC', id: 'ASC' },
      skip: offset,
      take: RELATED_PAGE_SIZE,
    });
    return { reports: await this.rows(reports), total };
  }

  async sanction(
    actor: User,
    id: string,
    dto: SanctionUserReportDto,
  ): Promise<void> {
    const report = await this.findOpen(id);
    const reason = dto.reason!.trim();
    const run = SANCTION_ACTIONS[dto.sanction];
    if (run) {
      if (!report.targetId) {
        throw ApiErrors.conflict(
          ApiErrorCode.NotFound,
          'The reported account is gone',
        );
      }
      if (!(await this.permissions.can(actor.roles, run.permission))) {
        throw ApiErrors.forbidden(
          ApiErrorCode.AdminForbidden,
          `Missing permission ${run.permission}`,
        );
      }
    }
    // Read first: deleting the account empties the target of its reports.
    const closing = report.targetId
      ? await this.reports.findBy({
          targetId: report.targetId,
          status: 'open',
        })
      : [report];
    if (run) {
      await this.runSanction(actor, report.targetId!, dto, reason);
      await this.audit.record({
        actorId: actor.id,
        action: run.action,
        targetType: 'user',
        targetId: report.targetId,
        reason,
        details: dto.fields
          ? { fields: dto.fields }
          : dto.until
            ? { until: dto.until }
            : null,
        succeeded: true,
        status: 204,
      });
    }
    await this.close(closing, actor, 'sanctioned', dto.sanction, reason);
  }

  async dismiss(actor: User, id: string, reason: string): Promise<void> {
    await this.close(
      [await this.findOpen(id)],
      actor,
      'dismissed',
      null,
      reason,
    );
  }

  private runSanction(
    actor: User,
    targetId: string,
    dto: SanctionUserReportDto,
    reason: string,
  ): Promise<void> {
    switch (dto.sanction) {
      case 'moderation':
        return this.accounts.moderate(actor, targetId, {
          fields: dto.fields!,
          reason,
        });
      case 'suspension':
        return this.accounts.suspend(actor, targetId, {
          until: dto.until,
          reason,
        });
      case 'deletion':
        return this.accounts.delete(actor, targetId);
      default:
        return Promise.resolve();
    }
  }

  /** Closes the reports, then tells their authors the outcome, never the kind of sanction. */
  private async close(
    reports: UserReport[],
    actor: User,
    status: Exclude<UserReportStatus, 'open'>,
    sanction: UserReportSanction | null,
    note: string,
  ): Promise<void> {
    await this.reports.update(
      { id: In(reports.map((report) => report.id)) },
      {
        status,
        sanction,
        resolvedById: actor.id,
        resolutionNote: note,
        resolvedAt: new Date(),
      },
    );
    await Promise.all(
      reports.flatMap(({ reporterId, targetUsername }) =>
        reporterId
          ? [
              this.notifications.notifyFromTeam(reporterId, 'report_closed', {
                username: targetUsername,
                outcome: status,
              }),
            ]
          : [],
      ),
    );
  }

  private async find(id: string): Promise<UserReport> {
    const report = await this.reports.findOneBy({ id });
    if (!report) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'Report not found');
    }
    return report;
  }

  private async findOpen(id: string): Promise<UserReport> {
    const report = await this.find(id);
    if (report.status !== 'open') {
      throw ApiErrors.conflict(
        ApiErrorCode.ReportClosed,
        'This report is already closed',
      );
    }
    return report;
  }

  /** The reports with their people, all read at once. */
  private async rows(reports: UserReport[]): Promise<AdminUserReport[]> {
    const ids = [
      ...new Set(
        reports.flatMap(({ targetId, reporterId, resolvedById }) =>
          [targetId, reporterId, resolvedById].filter(
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
      target: person(report.targetId),
      targetUsername: report.targetUsername,
      reporter: person(report.reporterId),
      createdAt: report.createdAt.toISOString(),
      sanction: report.sanction,
      resolver: person(report.resolvedById),
      resolutionNote: report.resolutionNote,
      resolvedAt: report.resolvedAt?.toISOString() ?? null,
    }));
  }
}
