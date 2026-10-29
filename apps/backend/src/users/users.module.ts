import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { AvatarsController } from './avatars.controller';
import { AvatarsService } from './avatars.service';
import { ReservedUsername } from './reserved-username.entity';
import { UserTagAssignment } from './user-tag-assignment.entity';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { CitySearchService } from './city-search.service';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserTagAssignment, ReservedUsername]),
    StorageModule,
  ],
  controllers: [UsersController, AvatarsController],
  providers: [UsersService, AvatarsService, CitySearchService],
  exports: [UsersService, AvatarsService],
})
export class UsersModule {}
