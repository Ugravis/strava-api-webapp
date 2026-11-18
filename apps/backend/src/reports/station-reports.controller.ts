import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import { ReportStationDto } from './reports.dto';
import { StationReportsService } from './station-reports.service';

/** Reports of the railway data filed from the map. */
@Controller('stations')
export class StationReportsController {
  constructor(private readonly reports: StationReportsService) {}

  @Post('reports')
  @HttpCode(HttpStatus.NO_CONTENT)
  report(
    @CurrentUser() user: User,
    @Body() dto: ReportStationDto,
  ): Promise<void> {
    return this.reports.report(user, dto);
  }
}
