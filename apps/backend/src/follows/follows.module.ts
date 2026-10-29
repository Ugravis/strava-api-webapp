import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistancesModule } from '../distances/distances.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StationsModule } from '../stations/stations.module';
import { TilesModule } from '../tiles/tiles.module';
import { UserTagAssignment } from '../users/user-tag-assignment.entity';
import { User } from '../users/user.entity';
import { Follow } from './follow.entity';
import { ProfileLike } from './profile-like.entity';
import { FollowsService } from './follows.service';
import { ProfileShowcaseService } from './profile-showcase.service';
import { ProfilesController } from './profiles.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Follow, User, UserTagAssignment, ProfileLike]),
    NotificationsModule,
    DistancesModule,
    StationsModule,
    TilesModule,
  ],
  controllers: [ProfilesController],
  providers: [FollowsService, ProfileShowcaseService],
})
export class FollowsModule {}
