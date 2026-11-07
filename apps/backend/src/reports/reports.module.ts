import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '../admin/admin.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/user.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { UserReport } from './user-report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserReport, User]),
    NotificationsModule,
    AdminModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
