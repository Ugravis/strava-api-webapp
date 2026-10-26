import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminMeController } from './admin-me.controller';
import { AuditLog } from './audit/audit-log.entity';
import { AuditLogService } from './audit/audit-log.service';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AdminGuard } from './guards/admin.guard';
import { AdminSession } from './sessions/admin-session.entity';
import { AdminSessionsService } from './sessions/admin-sessions.service';
import { AdminUser } from './users/admin-user.entity';

/** Back office API under `/api/admin`, isolated from the user sessions. */
@Module({
  imports: [TypeOrmModule.forFeature([AdminUser, AdminSession, AuditLog])],
  controllers: [AdminMeController],
  providers: [
    AdminSessionsService,
    AuditLogService,
    { provide: APP_GUARD, useClass: AdminGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AdminModule {}
