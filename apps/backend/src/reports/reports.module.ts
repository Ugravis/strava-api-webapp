import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '../admin/admin.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Place } from '../stations/place.entity';
import { User } from '../users/user.entity';
import { Report } from './report.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { StationReport } from './station-report.entity';
import { StationReportsController } from './station-reports.controller';
import { StationReportsService } from './station-reports.service';
import { UserReport } from './user-report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, UserReport, StationReport, Place, User]),
    NotificationsModule,
    AdminModule,
  ],
  controllers: [ReportsController, StationReportsController],
  providers: [ReportsService, StationReportsService],
})
export class ReportsModule {}
