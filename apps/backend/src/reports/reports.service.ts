import { ADMIN_ROLES } from '@kilotrace/shared/admin';
import { USER_REPORT_CUSTOM_REASON } from '@kilotrace/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminPermissionsService } from '../admin/permissions/admin-permissions.service';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { isUniqueViolation } from '../common/database-errors';
import { NotificationsService } from '../notifications/notifications.service';
import { isSuspended, User } from '../users/user.entity';
import type { ReportUserDto } from './reports.dto';
import { UserReport } from './user-report.entity';

/** Where a member opens a report, as the routes of the back office name it. */
const reportPath = (id: string) => `/admin/users?row=${id}`;

/** Filing a report on a profile. Processed by the team in the back office. */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(UserReport)
    private readonly reports: Repository<UserReport>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly permissions: AdminPermissionsService,
    private readonly notifications: NotificationsService,
  ) {}

  async report(
    reporter: User,
    username: string,
    dto: ReportUserDto,
  ): Promise<void> {
    const target = await this.users.findOneBy({ username });
    if (!target || isSuspended(target)) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'User not found');
    }
    if (target.id === reporter.id) {
      throw ApiErrors.badRequest(
        ApiErrorCode.CannotReportSelf,
        'You cannot report yourself',
      );
    }
    const details = dto.details?.trim() || null;
    if (dto.reason === USER_REPORT_CUSTOM_REASON && !details) {
      throw ApiErrors.badRequest(
        ApiErrorCode.ReportDetailsRequired,
        'A custom reason must be told',
      );
    }
    const report = await this.reports
      .save(
        this.reports.create({
          reporterId: reporter.id,
          targetId: target.id,
          targetUsername: target.username,
          reason: dto.reason,
          details,
        }),
      )
      .catch((error: unknown) => {
        if (isUniqueViolation(error, 'reporter_id, target_id')) {
          throw ApiErrors.conflict(
            ApiErrorCode.AlreadyReported,
            'This user is already reported by you',
          );
        }
        throw error;
      });
    await this.notifyTeam(report, [reporter.id, target.id]);
  }

  /** Tells the members who process reports, neither the reporter nor the target among them. */
  private async notifyTeam(
    report: UserReport,
    except: string[],
  ): Promise<void> {
    const members = await this.users
      .createQueryBuilder('user')
      .where('user.roles && :roles', { roles: [...ADMIN_ROLES] })
      .getMany();
    const handlers: User[] = [];
    for (const member of members) {
      if (
        !except.includes(member.id) &&
        (await this.permissions.can(member.roles, 'reports.handle'))
      ) {
        handlers.push(member);
      }
    }
    await Promise.all(
      handlers.map((member) =>
        this.notifications.notifyFromTeam(member.id, 'report_received', {
          username: report.targetUsername,
          href: reportPath(report.id),
        }),
      ),
    );
  }
}
