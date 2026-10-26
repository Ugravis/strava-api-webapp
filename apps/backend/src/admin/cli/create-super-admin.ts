import { AdminRole } from '@kilotrace/shared';
import { isEmail } from 'class-validator';
import { IsNull } from 'typeorm';
import dataSource from '../../database/data-source';
import { AuditLog } from '../audit/audit-log.entity';
import { AdminUser } from '../users/admin-user.entity';

/**
 * Creates the first super-admin, outside the back office:
 * `pnpm admin:create-super-admin <email>` in development,
 * `node dist/admin/cli/create-super-admin.js <email>` in the production image.
 * Refused once an enabled super-admin exists: later roles are granted from the
 * back office.
 */
async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !isEmail(email)) {
    throw new Error('Usage: create-super-admin <email>');
  }

  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      const superAdmins = await manager.count(AdminUser, {
        where: { role: AdminRole.SuperAdmin, disabledAt: IsNull() },
      });
      if (superAdmins > 0) {
        throw new Error('A super-admin already exists: use the back office');
      }
      const admin = await manager.save(
        manager.create(AdminUser, { email, role: AdminRole.SuperAdmin }),
      );
      await manager.insert(AuditLog, {
        actorId: null,
        action: 'admin-users.create-super-admin',
        targetType: 'admin-user',
        targetId: admin.id,
        succeeded: true,
      });
    });
  } finally {
    await dataSource.destroy();
  }
  console.log(`${email} is now super-admin.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
