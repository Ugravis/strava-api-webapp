import { AdminRole } from '@kilotrace/shared/admin';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import adminConfig, { type AdminConfig } from '../../config/admin.config';
import { normalizeEmail } from '../../users/users.service';
import { UserDistinction } from '../../users/user-distinction.entity';
import { User } from '../../users/user.entity';
import { AdminAuditLogService } from '../audit/admin-audit-log.service';

export const BOOTSTRAP_ACTION = 'roles.bootstrap';

/**
 * Makes the `ADMIN_BOOTSTRAP_EMAIL` account the first super-admin, only
 * while no user holds a back-office role: once any role is granted, the
 * variable is ignored, so withdrawing it never brings it back at the next
 * startup. The account must exist: sign up first, then restart.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AdminAuditLogService,
    @Inject(adminConfig.KEY) private readonly config: AdminConfig,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.bootstrapEmail;
    if (!email) {
      return;
    }
    const outcome = await this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const hasRoles = await users
        .createQueryBuilder('user')
        .where("user.roles <> '{}'")
        .getExists();
      if (hasRoles) {
        return 'ignored';
      }
      const user = await users.findOneBy({ email: normalizeEmail(email) });
      if (!user) {
        return 'missing';
      }
      await users.update(user.id, { roles: [AdminRole.SuperAdmin] });
      await manager
        .createQueryBuilder()
        .insert()
        .into(UserDistinction)
        .values({ userId: user.id, kind: 'team' })
        .orIgnore()
        .execute();
      await this.audit.record(
        {
          actorId: null,
          action: BOOTSTRAP_ACTION,
          targetType: 'user',
          targetId: user.id,
          succeeded: true,
        },
        manager,
      );
      return 'granted';
    });
    if (outcome === 'granted') {
      this.logger.log(`${email} made the first super-admin`);
    } else if (outcome === 'missing') {
      this.logger.warn(`No account for ${email}: sign up, then restart`);
    }
  }
}
