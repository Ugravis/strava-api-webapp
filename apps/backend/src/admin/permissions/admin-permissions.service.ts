import {
  type AdminPermission,
  type AdminRoleGrants,
  EDITABLE_ADMIN_ROLES,
  invalidGrant,
  isAdminPermission,
  permissionsOf,
} from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { AdminRolePermission } from './admin-role-permission.entity';

/**
 * Permissions of the roles below super-admin. Read on every back-office
 * call, they are kept in memory and reloaded after each change.
 */
@Injectable()
export class AdminPermissionsService {
  private cached: Promise<AdminRoleGrants> | null = null;

  constructor(
    @InjectRepository(AdminRolePermission)
    private readonly rows: Repository<AdminRolePermission>,
    private readonly dataSource: DataSource,
  ) {}

  grants(): Promise<AdminRoleGrants> {
    this.cached ??= this.load().catch((error: unknown) => {
      this.cached = null;
      throw error;
    });
    return this.cached;
  }

  async permissionsOf(roles: readonly string[]): Promise<AdminPermission[]> {
    return permissionsOf(roles, await this.grants());
  }

  async can(
    roles: readonly string[],
    permission: AdminPermission,
  ): Promise<boolean> {
    return (await this.permissionsOf(roles)).includes(permission);
  }

  /** Replaces the whole table, refused when a permission lacks what it requires. */
  async setGrants(grants: AdminRoleGrants): Promise<void> {
    for (const role of EDITABLE_ADMIN_ROLES) {
      const invalid = invalidGrant(grants[role]);
      if (invalid) {
        throw ApiErrors.badRequest(
          ApiErrorCode.InvalidPermissions,
          `${invalid} cannot be granted to ${role} this way`,
        );
      }
    }
    const rows = EDITABLE_ADMIN_ROLES.flatMap((role) =>
      [...new Set(grants[role])].map((permission) => ({ role, permission })),
    );
    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .delete()
        .from(AdminRolePermission)
        .execute();
      if (rows.length) {
        await manager.insert(AdminRolePermission, rows);
      }
    });
    this.cached = null;
  }

  private async load(): Promise<AdminRoleGrants> {
    const grants: AdminRoleGrants = { support: [], admin: [] };
    for (const { role, permission } of await this.rows.find()) {
      if (role in grants && isAdminPermission(permission)) {
        grants[role].push(permission);
      }
    }
    return grants;
  }
}
