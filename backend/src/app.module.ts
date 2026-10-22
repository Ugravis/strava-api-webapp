import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ActivitiesModule } from './activities/activities.module';
import { ApiIndexModule } from './api-index/api-index.module';
import { AuthModule } from './auth/auth.module';
import { DEFAULT_THROTTLE } from './auth/throttle';
import { CountriesModule } from './countries/countries.module';
import { DevModule } from './dev/dev.module';
import { DistancesModule } from './distances/distances.module';
import { FollowsModule } from './follows/follows.module';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import { validateEnvironment } from './config/environment.validation';
import googleConfig from './config/google.config';
import mailConfig from './config/mail.config';
import storageConfig from './config/storage.config';
import profilesConfig from './config/profiles.config';
import stravaConfig from './config/strava.config';
import { HealthController } from './health/health.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { StationsModule } from './stations/stations.module';
import { StravaModule } from './strava/strava.module';
import { TilesModule } from './tiles/tiles.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      load: [
        databaseConfig,
        authConfig,
        googleConfig,
        mailConfig,
        storageConfig,
        stravaConfig,
        profilesConfig,
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions =>
        config.getOrThrow<TypeOrmModuleOptions>('database'),
    }),
    ThrottlerModule.forRoot([DEFAULT_THROTTLE]),
    UsersModule,
    AuthModule,
    ActivitiesModule,
    StravaModule,
    DistancesModule,
    TilesModule,
    CountriesModule,
    StationsModule,
    FollowsModule,
    NotificationsModule,
    ApiIndexModule.forEnvironment(),
    // Temporary development tools, never loaded in production.
    DevModule.forEnvironment(),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
