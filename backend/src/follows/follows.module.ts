import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistancesModule } from '../distances/distances.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StationsModule } from '../stations/stations.module';
import { TilesModule } from '../tiles/tiles.module';
import { UserDistinction } from '../users/user-distinction.entity';
import { User } from '../users/user.entity';
import { Follow } from './follow.entity';
import { FollowsService } from './follows.service';
import { ProfileShowcaseService } from './profile-showcase.service';
import { ProfilesController } from './profiles.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Follow, User, UserDistinction]),
    NotificationsModule,
    DistancesModule,
    StationsModule,
    TilesModule,
  ],
  controllers: [ProfilesController],
  providers: [FollowsService, ProfileShowcaseService],
})
export class FollowsModule {}
