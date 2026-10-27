import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdminAccessMiddleware } from './access/admin-access.middleware';
import { AdminRolesGuard } from './access/admin-roles.guard';
import { AdminMeController } from './admin-me.controller';
import { AdminAuditLog } from './audit/admin-audit-log.entity';
import { AdminAuditLogService } from './audit/admin-audit-log.service';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AdminBootstrapService } from './bootstrap/admin-bootstrap.service';
import { AdminStatisticsController } from './statistics/admin-statistics.controller';
import { AdminStatisticsService } from './statistics/admin-statistics.service';

/** Every path under `/api/admin`, whether a route exists or not. */
export const ADMIN_ROUTES = [
  { path: 'admin', method: RequestMethod.ALL },
  { path: 'admin/*path', method: RequestMethod.ALL },
];

/**
 * Back office under `/api/admin`, called by the Next.js server only (the
 * frontend proxy blocks it from the browser).
 */
@Module({
  imports: [TypeOrmModule.forFeature([AdminAuditLog]), AuthModule],
  controllers: [AdminMeController, AdminStatisticsController],
  providers: [
    AdminAuditLogService,
    AdminBootstrapService,
    AdminStatisticsService,
    { provide: APP_GUARD, useClass: AdminRolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AdminAccessMiddleware).forRoutes(...ADMIN_ROUTES);
  }
}
