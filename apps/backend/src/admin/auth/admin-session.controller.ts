import { Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { CurrentSession } from '../../auth/decorators/current-user.decorator';
import type { Session } from '../../auth/sessions/session.entity';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember } from '../access/permission.decorator';
import { NotAudited } from '../audit/audited.decorator';
import { AdminAuthService } from './admin-auth.service';

@AdminController('session')
export class AdminSessionController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** Signs out of the back office only: the session of the site, if any, stays. */
  @Delete()
  @AnyMember()
  @NotAudited()
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentSession() session: Session): Promise<void> {
    return this.adminAuth.logout(session.id);
  }
}
