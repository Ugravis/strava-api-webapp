import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { AvatarsController } from './avatars.controller';
import { AvatarsService } from './avatars.service';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), StorageModule],
  controllers: [UsersController, AvatarsController],
  providers: [UsersService, AvatarsService],
  exports: [UsersService, AvatarsService],
})
export class UsersModule {}
