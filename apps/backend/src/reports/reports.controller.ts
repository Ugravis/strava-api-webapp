import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsernameParamsDto } from '../follows/follows.dto';
import type { User } from '../users/user.entity';
import { ReportUserDto } from './reports.dto';
import { ReportsService } from './reports.service';

/** Reports filed from a profile. */
@Controller('profiles')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post(':username/report')
  @HttpCode(HttpStatus.NO_CONTENT)
  report(
    @CurrentUser() user: User,
    @Param() { username }: UsernameParamsDto,
    @Body() dto: ReportUserDto,
  ): Promise<void> {
    return this.reports.report(user, username, dto);
  }
}
