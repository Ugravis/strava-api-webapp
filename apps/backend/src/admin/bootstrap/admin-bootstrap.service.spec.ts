import { AdminRole } from '@kilotrace/shared';
import type { DataSource, EntityManager } from 'typeorm';
import type { AdminAuthConfig } from '../../config/admin-auth.config';
import { AuditLog } from '../audit/audit-log.entity';
import { AdminUser } from '../users/admin-user.entity';
import {
  AdminBootstrapService,
  BOOTSTRAP_ACTION,
} from './admin-bootstrap.service';

describe('AdminBootstrapService', () => {
  let manager: jest.Mocked<
    Pick<EntityManager, 'count' | 'create' | 'save' | 'insert'>
  >;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;

  beforeEach(() => {
    manager = {
      count: jest.fn(),
      create: jest.fn((_entity: unknown, values: object) => values) as never,
      save: jest.fn((entity: object) =>
        Promise.resolve({ ...entity, id: 'admin-id' }),
      ) as never,
      insert: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn((run: (manager: EntityManager) => unknown) =>
        Promise.resolve(run(manager as unknown as EntityManager)),
      ) as never,
    };
  });

  const serviceWith = (bootstrapEmail: string | null) =>
    new AdminBootstrapService(
      dataSource as unknown as DataSource,
      {
        bootstrapEmail,
      } as AdminAuthConfig,
    );

  it('creates the configured super-admin and records it while there is no account', async () => {
    manager.count.mockResolvedValue(0);

    await serviceWith('boss@example.com').onApplicationBootstrap();

    expect(manager.count).toHaveBeenCalledWith(AdminUser);
    expect(manager.create).toHaveBeenCalledWith(AdminUser, {
      email: 'boss@example.com',
      role: AdminRole.SuperAdmin,
    });
    expect(manager.insert).toHaveBeenCalledWith(AuditLog, {
      actorId: null,
      action: BOOTSTRAP_ACTION,
      targetType: 'admin-user',
      targetId: 'admin-id',
      succeeded: true,
    });
  });

  it('ignores the variable once any account exists, even a disabled one', async () => {
    manager.count.mockResolvedValue(1);

    await serviceWith('boss@example.com').onApplicationBootstrap();

    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it('does nothing without the variable', async () => {
    await serviceWith(null).onApplicationBootstrap();

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
