import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ActivitiesModule } from './activities/activities.module';
import { AuthModule } from './auth/auth.module';
import { DevModule } from './dev/dev.module';
import { DistancesModule } from './distances/distances.module';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import googleConfig from './config/google.config';
import mailConfig from './config/mail.config';
import storageConfig from './config/storage.config';
import stravaConfig from './config/strava.config';
import { HealthController } from './health/health.controller';
import { StravaModule } from './strava/strava.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        googleConfig,
        mailConfig,
        storageConfig,
        stravaConfig,
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions =>
        config.getOrThrow<TypeOrmModuleOptions>('database'),
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    UsersModule,
    AuthModule,
    ActivitiesModule,
    StravaModule,
    DistancesModule,
    // Temporary development tools, never loaded in production.
    DevModule.forEnvironment(),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
