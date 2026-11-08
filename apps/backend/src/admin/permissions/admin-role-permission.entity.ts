import type {
  AdminPermission,
  EditableAdminRole,
} from '@kilotrace/shared/admin';
import { Entity, PrimaryColumn } from 'typeorm';

/**
 * A permission granted to a role below super-admin, set from the
 * Permissions page. A row whose permission left the catalog is ignored.
 */
@Entity('admin_role_permissions')
export class AdminRolePermission {
  @PrimaryColumn({
    type: 'varchar',
    length: 16,
    primaryKeyConstraintName: 'PK_admin_role_permissions',
  })
  role!: EditableAdminRole;

  @PrimaryColumn({
    type: 'varchar',
    length: 40,
    primaryKeyConstraintName: 'PK_admin_role_permissions',
  })
  permission!: AdminPermission;
}
