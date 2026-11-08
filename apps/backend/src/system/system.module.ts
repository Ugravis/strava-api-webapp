import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSettings } from './system-settings.entity';
import { SystemSettingsService } from './system-settings.service';
import { SystemController } from './system.controller';

/** Switches of the whole site: maintenance banner, sign-ups, showcase of the profiles. */
@Module({
  imports: [TypeOrmModule.forFeature([SystemSettings])],
  controllers: [SystemController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemModule {}
