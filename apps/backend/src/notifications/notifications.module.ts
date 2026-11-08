import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from '../follows/follow.entity';
import { NotificationStreams } from './notification-streams';
import { Notification } from './notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Follow])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationStreams],
  exports: [NotificationsService],
})
export class NotificationsModule {}
