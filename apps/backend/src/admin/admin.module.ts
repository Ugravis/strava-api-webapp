import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../activities/activity.entity';
import { AuthModule } from '../auth/auth.module';
import { OAuthAccount } from '../auth/google/oauth-account.entity';
import { Session } from '../auth/sessions/session.entity';
import { Badge } from '../distances/badge.entity';
import { BadgeTheme } from '../distances/badge-theme.entity';
import { ProviderConnection } from '../connections/provider-connection.entity';
import { Follow } from '../follows/follow.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { StravaModule } from '../strava/strava.module';
import { SystemModule } from '../system/system.module';
import { UserTag } from '../users/user-tag.entity';
import { UserTagAssignment } from '../users/user-tag-assignment.entity';
import { ReservedUsername } from '../users/reserved-username.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { AdminAccessMiddleware } from './access/admin-access.middleware';
import { AdminRolesGuard } from './access/admin-roles.guard';
import { AdminMeController } from './admin-me.controller';
import { AdminNavigationController } from './admin-navigation.controller';
import { AdminAuditLogController } from './audit/admin-audit-log.controller';
import { AdminAuditLog } from './audit/admin-audit-log.entity';
import { AdminAuditLogService } from './audit/admin-audit-log.service';
import { AuditInterceptor } from './audit/audit.interceptor';
import {
  AdminBadgesController,
  AdminBadgeThemesController,
} from './badges/admin-badges.controller';
import { AdminBadgesService } from './badges/admin-badges.service';
import { AdminUserTagsController } from './user-tags/admin-user-tags.controller';
import { AdminUserTagsService } from './user-tags/admin-user-tags.service';
import { AdminBootstrapService } from './bootstrap/admin-bootstrap.service';
import { AdminDevController } from './dev/admin-dev.controller';
import { AdminDevService } from './dev/admin-dev.service';
import { AdminGithubService } from './dev/admin-github.service';
import { AdminPermissionsController } from './permissions/admin-permissions.controller';
import { AdminPermissionsService } from './permissions/admin-permissions.service';
import { AdminRolePermission } from './permissions/admin-role-permission.entity';
import { AdminReservedUsernamesController } from './reserved-usernames/admin-reserved-usernames.controller';
import { AdminReservedUsernamesService } from './reserved-usernames/admin-reserved-usernames.service';
import { AdminStatisticsController } from './statistics/admin-statistics.controller';
import { AdminStatisticsService } from './statistics/admin-statistics.service';
import { AdminSystemController } from './system/admin-system.controller';
import { AdminTeamController } from './team/admin-team.controller';
import { AdminTeamService } from './team/admin-team.service';
import { AdminUploadsService } from './system/admin-uploads.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';

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
  imports: [
    TypeOrmModule.forFeature([
      AdminAuditLog,
      User,
      Session,
      ProviderConnection,
      Activity,
      Follow,
      UserTagAssignment,
      UserTag,
      OAuthAccount,
      Badge,
      BadgeTheme,
      ReservedUsername,
      AdminRolePermission,
    ]),
    AuthModule,
    UsersModule,
    StravaModule,
    NotificationsModule,
    StorageModule,
    SystemModule,
  ],
  controllers: [
    AdminMeController,
    AdminNavigationController,
    AdminStatisticsController,
    AdminUsersController,
    AdminAuditLogController,
    AdminBadgesController,
    AdminBadgeThemesController,
    AdminUserTagsController,
    AdminSystemController,
    AdminTeamController,
    AdminPermissionsController,
    AdminReservedUsernamesController,
    AdminDevController,
  ],
  providers: [
    AdminAuditLogService,
    AdminUsersService,
    AdminBootstrapService,
    AdminStatisticsService,
    AdminBadgesService,
    AdminUserTagsService,
    AdminUploadsService,
    AdminTeamService,
    AdminReservedUsernamesService,
    AdminDevService,
    AdminGithubService,
    AdminPermissionsService,
    { provide: APP_GUARD, useClass: AdminRolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AdminAccessMiddleware).forRoutes(...ADMIN_ROUTES);
  }
}
