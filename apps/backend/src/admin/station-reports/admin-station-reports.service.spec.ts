import type { Repository } from 'typeorm';
import type { NotificationsService } from '../../notifications/notifications.service';
import type { StationReport } from '../../reports/station-report.entity';
import type { User } from '../../users/user.entity';
import { AdminStationReportsService } from './admin-station-reports.service';

const actor = { id: 'admin', roles: ['admin'] } as unknown as User;

function reportOf(overrides: Partial<StationReport> = {}): StationReport {
  return {
    id: 'report',
    reporterId: 'reporter',
    placeId: 12,
    stationName: 'Lyon Part-Dieu',
    status: 'open',
    ...overrides,
  } as StationReport;
}

describe('AdminStationReportsService', () => {
  const setup = (report: StationReport) => {
    const reports = {
      findOneBy: jest.fn().mockResolvedValue(report),
      update: jest.fn().mockResolvedValue({}),
    };
    const notifications = {
      notifyFromTeam: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AdminStationReportsService(
      reports as unknown as Repository<StationReport>,
      {} as Repository<User>,
      notifications as unknown as NotificationsService,
    );
    return { service, reports, notifications };
  };

  it('accepts an open report and tells its author with the note', async () => {
    const { service, reports, notifications } = setup(reportOf());

    await service.accept(actor, 'report', 'Next import');

    expect(reports.update).toHaveBeenCalledWith(
      'report',
      expect.objectContaining({ status: 'accepted', resolvedById: 'admin' }),
    );
    expect(notifications.notifyFromTeam).toHaveBeenCalledWith(
      'reporter',
      'station_report_closed',
      { station: 'Lyon Part-Dieu', outcome: 'accepted', reason: 'Next import' },
    );
  });

  it('dismisses with its reason, the note left out when empty', async () => {
    const { service, reports, notifications } = setup(reportOf());

    await service.dismiss(actor, 'report', 'osm_correct', null);

    expect(reports.update).toHaveBeenCalledWith(
      'report',
      expect.objectContaining({
        status: 'dismissed',
        dismissal: 'osm_correct',
      }),
    );
    expect(notifications.notifyFromTeam).toHaveBeenCalledWith(
      'reporter',
      'station_report_closed',
      {
        station: 'Lyon Part-Dieu',
        outcome: 'dismissed',
        dismissal: 'osm_correct',
      },
    );
  });

  it('requires a note for a custom dismissal', async () => {
    const { service, reports } = setup(reportOf());

    await expect(
      service.dismiss(actor, 'report', 'other', null),
    ).rejects.toMatchObject({ status: 400 });
    expect(reports.update).not.toHaveBeenCalled();
  });

  it('completes an accepted report only', async () => {
    const open = setup(reportOf());
    await expect(
      open.service.complete(actor, 'report', null),
    ).rejects.toMatchObject({
      status: 409,
    });

    const { service, reports, notifications } = setup(
      reportOf({ status: 'accepted' }),
    );
    await service.complete(actor, 'report', null);

    expect(reports.update).toHaveBeenCalledWith(
      'report',
      expect.objectContaining({ status: 'done', completedById: 'admin' }),
    );
    expect(notifications.notifyFromTeam).toHaveBeenCalledWith(
      'reporter',
      'station_report_closed',
      { station: 'Lyon Part-Dieu', outcome: 'done' },
    );
  });

  it('refuses a second decision on a dismissed report', async () => {
    const { service } = setup(reportOf({ status: 'dismissed' }));

    await expect(service.accept(actor, 'report', null)).rejects.toMatchObject({
      status: 409,
    });
  });
});
