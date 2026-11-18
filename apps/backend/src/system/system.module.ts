import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { AppSetting } from './app-setting.entity';
import { AppSettingsService } from './app-settings.service';
import { SystemSettingsService } from './system-settings.service';
import { SystemController } from './system.controller';

/** Maintenance banner and settings of the whole site, set from the back office. */
@Module({
  imports: [TypeOrmModule.forFeature([AppSetting, User])],
  controllers: [SystemController],
  providers: [SystemSettingsService, AppSettingsService],
  exports: [SystemSettingsService, AppSettingsService],
})
export class SystemModule {}
