import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/user.entity';
import { Follow } from './follow.entity';
import { FollowsService } from './follows.service';
import { ProfilesController } from './profiles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Follow, User]), NotificationsModule],
  controllers: [ProfilesController],
  providers: [FollowsService],
})
export class FollowsModule {}
