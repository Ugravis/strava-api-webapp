import type { Repository } from 'typeorm';
import type { NotificationsService } from '../../notifications/notifications.service';
import type { UserReport } from '../../reports/user-report.entity';
import type { User } from '../../users/user.entity';
import type { AdminAuditLogService } from '../audit/admin-audit-log.service';
import type { AdminPermissionsService } from '../permissions/admin-permissions.service';
import type { AdminUsersService } from '../users/admin-users.service';
import { AdminUserReportsService } from './admin-user-reports.service';

const actor = { id: 'admin', roles: ['admin'] } as unknown as User;

function reportOf(overrides: Partial<UserReport> = {}): UserReport {
  return {
    id: 'report',
    reporterId: 'reporter',
    targetId: 'target',
    targetUsername: 'bad_user',
    status: 'open',
    ...overrides,
  } as UserReport;
}

describe('AdminUserReportsService', () => {
  const setup = (report: UserReport, others: UserReport[] = [], can = true) => {
    const reports = {
      findOneBy: jest.fn().mockResolvedValue(report),
      findBy: jest.fn().mockResolvedValue([report, ...others]),
      update: jest.fn().mockResolvedValue({}),
    };
    const accounts = {
      suspend: jest.fn().mockResolvedValue(undefined),
      moderate: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const notifications = {
      notifyFromTeam: jest.fn().mockResolvedValue(undefined),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminUserReportsService(
      reports as unknown as Repository<UserReport>,
      {} as Repository<User>,
      accounts as unknown as AdminUsersService,
      {
        can: jest.fn().mockResolvedValue(can),
      } as unknown as AdminPermissionsService,
      audit as unknown as AdminAuditLogService,
      notifications as unknown as NotificationsService,
    );
    return { service, reports, accounts, notifications, audit };
  };

  it('suspends the target and closes every open report on it', async () => {
    const other = reportOf({ id: 'other', reporterId: 'second' });
    const { service, reports, accounts, notifications, audit } = setup(
      reportOf(),
      [other],
    );

    await service.sanction(actor, 'report', {
      sanction: 'suspension',
      reason: 'Abusive behaviour',
    });

    expect(accounts.suspend).toHaveBeenCalledWith(actor, 'target', {
      until: undefined,
      reason: 'Abusive behaviour',
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'users.suspend', targetId: 'target' }),
    );
    const [where, values] = reports.update.mock.calls[0] as [
      { id: { value: string[] } },
      { status: string; sanction: string },
    ];
    expect(where.id.value).toEqual(['report', 'other']);
    expect(values).toMatchObject({
      status: 'sanctioned',
      sanction: 'suspension',
    });
    expect(notifications.notifyFromTeam).toHaveBeenCalledTimes(2);
    expect(notifications.notifyFromTeam).toHaveBeenCalledWith(
      'second',
      'report_closed',
      { username: 'bad_user', outcome: 'sanctioned' },
    );
  });

  it('refuses a sanction without the permission of its action', async () => {
    const { service, accounts, reports } = setup(reportOf(), [], false);

    await expect(
      service.sanction(actor, 'report', {
        sanction: 'deletion',
        reason: 'Fake account',
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(accounts.delete).not.toHaveBeenCalled();
    expect(reports.update).not.toHaveBeenCalled();
  });

  it('leaves the reports open when the sanction fails', async () => {
    const { service, accounts, reports } = setup(reportOf());
    accounts.suspend.mockRejectedValue(new Error('refused'));

    await expect(
      service.sanction(actor, 'report', {
        sanction: 'suspension',
        reason: 'Abusive behaviour',
      }),
    ).rejects.toThrow('refused');
    expect(reports.update).not.toHaveBeenCalled();
  });

  it('closes as sanctioned without touching the account', async () => {
    const { service, accounts, audit, reports } = setup(reportOf());

    await service.sanction(actor, 'report', {
      sanction: 'other',
      reason: 'Already suspended',
    });

    expect(accounts.suspend).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(reports.update).toHaveBeenCalledTimes(1);
  });

  it('dismisses only its own report and tells its author', async () => {
    const { service, reports, accounts, notifications } = setup(reportOf());

    await service.dismiss(actor, 'report', 'Nothing found');

    expect(reports.findBy).not.toHaveBeenCalled();
    expect(accounts.suspend).not.toHaveBeenCalled();
    expect(notifications.notifyFromTeam).toHaveBeenCalledWith(
      'reporter',
      'report_closed',
      { username: 'bad_user', outcome: 'dismissed' },
    );
  });

  it('refuses a report already closed', async () => {
    const { service } = setup(reportOf({ status: 'dismissed' }));

    await expect(
      service.dismiss(actor, 'report', 'Nothing found'),
    ).rejects.toMatchObject({ status: 409 });
  });
});
