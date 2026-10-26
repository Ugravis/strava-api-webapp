import { AdminRole } from '@kilotrace/shared';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import adminAuthConfig, {
  type AdminAuthConfig,
} from '../../config/admin-auth.config';
import { AuditLog } from '../audit/audit-log.entity';
import { AdminUser } from '../users/admin-user.entity';

export const BOOTSTRAP_ACTION = 'admin-users.bootstrap';

/**
 * Creates the first super-admin from `ADMIN_BOOTSTRAP_EMAIL`, only while
 * `admin_users` is empty: once any account exists, the variable is ignored,
 * so disabling that account never brings it back at the next startup.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(adminAuthConfig.KEY) private readonly config: AdminAuthConfig,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.bootstrapEmail;
    if (!email) {
      return;
    }
    const created = await this.dataSource.transaction(async (manager) => {
      if ((await manager.count(AdminUser)) > 0) {
        return false;
      }
      const admin = await manager.save(
        manager.create(AdminUser, { email, role: AdminRole.SuperAdmin }),
      );
      await manager.insert(AuditLog, {
        actorId: null,
        action: BOOTSTRAP_ACTION,
        targetType: 'admin-user',
        targetId: admin.id,
        succeeded: true,
      });
      return true;
    });
    if (created) {
      this.logger.log(`${email} created as the first super-admin`);
    }
  }
}
