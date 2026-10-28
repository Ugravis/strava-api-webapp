import { DEFAULT_ADMIN_GRANTS } from '@kilotrace/shared/admin';
import type { DataSource, Repository } from 'typeorm';
import type { AdminRolePermission } from './admin-role-permission.entity';
import { AdminPermissionsService } from './admin-permissions.service';

describe('AdminPermissionsService', () => {
  let rows: { find: jest.Mock };
  let manager: { insert: jest.Mock; execute: jest.Mock };
  let service: AdminPermissionsService;

  beforeEach(() => {
    rows = {
      find: jest.fn().mockResolvedValue([
        { role: 'support', permission: 'users.view' },
        { role: 'admin', permission: 'users.view' },
        { role: 'admin', permission: 'users.suspend' },
        { role: 'admin', permission: 'gone.from.catalog' },
      ]),
    };
    manager = { insert: jest.fn(), execute: jest.fn() };
    const builder = {
      delete: () => builder,
      from: () => builder,
      execute: manager.execute,
    };
    const dataSource = {
      transaction: (run: (m: unknown) => Promise<void>) =>
        run({ ...manager, createQueryBuilder: () => builder }),
    };
    service = new AdminPermissionsService(
      rows as unknown as Repository<AdminRolePermission>,
      dataSource as unknown as DataSource,
    );
  });

  it('grants the stored permissions, ignoring those left out of the catalog', async () => {
    expect(await service.permissionsOf(['admin'])).toEqual([
      'users.view',
      'users.suspend',
    ]);
    expect(await service.can(['support'], 'users.suspend')).toBe(false);
  });

  it('grants every permission to a super-admin', async () => {
    expect(await service.can(['super-admin'], 'permissions.manage')).toBe(true);
  });

  it('reads the table once until it changes', async () => {
    await service.grants();
    await service.grants();
    expect(rows.find).toHaveBeenCalledTimes(1);

    await service.setGrants(DEFAULT_ADMIN_GRANTS);
    await service.grants();
    expect(rows.find).toHaveBeenCalledTimes(2);
  });

  it('replaces the whole table', async () => {
    await service.setGrants({ support: [], admin: ['users.view'] });
    expect(manager.execute).toHaveBeenCalled();
    expect(manager.insert).toHaveBeenCalledWith(expect.anything(), [
      { role: 'admin', permission: 'users.view' },
    ]);
  });

  it('refuses an action without the permission it requires', async () => {
    await expect(
      service.setGrants({ support: ['users.suspend'], admin: [] }),
    ).rejects.toMatchObject({ response: { code: 'INVALID_PERMISSIONS' } });
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it('refuses a permission kept for the super-admins', async () => {
    await expect(
      service.setGrants({ support: [], admin: ['team.view', 'team.manage'] }),
    ).rejects.toMatchObject({ response: { code: 'INVALID_PERMISSIONS' } });
  });
});
