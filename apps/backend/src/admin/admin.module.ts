import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleOAuthService } from '../auth/google/google-oauth.service';
import adminAuthConfig, {
  type AdminAuthConfig,
} from '../config/admin-auth.config';
import { AdminMeController } from './admin-me.controller';
import { AuditLog } from './audit/audit-log.entity';
import { AuditLogService } from './audit/audit-log.service';
import { AuditInterceptor } from './audit/audit.interceptor';
import {
  ADMIN_GOOGLE_OAUTH,
  AdminAuthController,
} from './auth/admin-auth.controller';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminBootstrapService } from './bootstrap/admin-bootstrap.service';
import { AdminGuard } from './guards/admin.guard';
import { AdminSession } from './sessions/admin-session.entity';
import { AdminSessionsService } from './sessions/admin-sessions.service';
import { AdminUser } from './users/admin-user.entity';

/** Back office API under `/api/admin`, isolated from the user sessions. */
@Module({
  imports: [
    ConfigModule.forFeature(adminAuthConfig),
    TypeOrmModule.forFeature([AdminUser, AdminSession, AuditLog]),
  ],
  controllers: [AdminMeController, AdminAuthController],
  providers: [
    AdminSessionsService,
    AdminAuthService,
    AdminBootstrapService,
    AuditLogService,
    {
      provide: ADMIN_GOOGLE_OAUTH,
      inject: [adminAuthConfig.KEY],
      useFactory: (config: AdminAuthConfig) =>
        new GoogleOAuthService(config.google),
    },
    { provide: APP_GUARD, useClass: AdminGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AdminModule {}
