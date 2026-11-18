import {
  STATION_REPORT_CUSTOM_REASON,
  STATION_REPORT_GENERAL_REASONS,
  STATION_REPORT_STATION_REASONS,
  type StationReportReason,
} from '@kilotrace/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AdminPermissionsService } from '../admin/permissions/admin-permissions.service';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { NotificationsService } from '../notifications/notifications.service';
import { Place } from '../stations/place.entity';
import { User } from '../users/user.entity';
import { reportHandlers } from './report-team';
import type { ReportStationDto } from './reports.dto';
import { StationReport } from './station-report.entity';

/** Where a member opens a report, as the routes of the back office name it. */
const reportPath = (id: string) => `/admin/stations?row=${id}`;

/**
 * Filing a report of the railway data, from the map: about a station from
 * its panel, or general (a station missing…) from the band. Processed by the
 * team in the back office.
 */
@Injectable()
export class StationReportsService {
  constructor(
    @InjectRepository(StationReport)
    private readonly reports: Repository<StationReport>,
    @InjectRepository(Place) private readonly places: Repository<Place>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly permissions: AdminPermissionsService,
    private readonly notifications: NotificationsService,
  ) {}

  async report(reporter: User, dto: ReportStationDto): Promise<void> {
    const stationId = dto.stationId ?? null;
    const reasons: readonly StationReportReason[] =
      stationId === null
        ? STATION_REPORT_GENERAL_REASONS
        : STATION_REPORT_STATION_REASONS;
    if (!reasons.includes(dto.reason)) {
      throw ApiErrors.badRequest(
        ApiErrorCode.InvalidField,
        'This reason does not apply here',
      );
    }
    const details = dto.details?.trim() || null;
    if (dto.reason === STATION_REPORT_CUSTOM_REASON && !details) {
      throw ApiErrors.badRequest(
        ApiErrorCode.ReportDetailsRequired,
        'A custom reason must be told',
      );
    }
    const place =
      stationId === null
        ? null
        : await this.places.findOneBy({
            id: stationId,
            kind: 'station',
            hiddenAt: IsNull(),
          });
    if (stationId !== null && !place) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such station');
    }
    const stationName = place ? (place.customName ?? place.name) : null;
    const report = await this.reports.save(
      this.reports.create({
        reporterId: reporter.id,
        placeId: place?.id ?? null,
        stationName,
        reason: dto.reason,
        details,
      }),
    );
    await this.notifications.notifyFromTeam(
      reporter.id,
      'station_report_sent',
      { station: stationName },
    );
    const handlers = await reportHandlers(
      this.users,
      this.permissions,
      'stations.reports',
      [reporter.id],
    );
    await Promise.all(
      handlers.map((member) =>
        this.notifications.notifyFromTeam(
          member.id,
          'station_report_received',
          { station: stationName, href: reportPath(report.id) },
        ),
      ),
    );
  }
}
