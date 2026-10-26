import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { GoogleProfile } from '../../auth/google/google-oauth.service';
import { AuditLogService } from '../audit/audit-log.service';
import {
  type AdminSessionMetadata,
  AdminSessionsService,
  type CreatedAdminSession,
} from '../sessions/admin-sessions.service';
import { AdminUser } from '../users/admin-user.entity';

export const SIGN_IN_ACTION = 'admin-auth.sign-in';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly admins: Repository<AdminUser>,
    private readonly sessions: AdminSessionsService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * Opens a session for an enabled account whose email Google verified, the
   * accounts being the allowlist. One session at a time: the previous ones
   * end. Every attempt is audited; refused ones record the email.
   */
  async signIn(
    profile: GoogleProfile,
    metadata: AdminSessionMetadata,
  ): Promise<CreatedAdminSession | null> {
    const email = profile.email.trim().toLowerCase();
    const admin = profile.emailVerified
      ? await this.admins.findOne({ where: { email } })
      : null;
    if (!admin || admin.disabledAt) {
      await this.audit.record({
        actorId: null,
        action: SIGN_IN_ACTION,
        targetType: 'email',
        targetId: email.slice(0, 100),
        succeeded: false,
        ipAddress: metadata.ipAddress,
      });
      return null;
    }

    await this.sessions.revokeAllFor(admin.id);
    const session = await this.sessions.create(admin.id, metadata);
    await this.audit.record({
      actorId: admin.id,
      action: SIGN_IN_ACTION,
      targetType: 'admin-user',
      targetId: admin.id,
      succeeded: true,
      ipAddress: metadata.ipAddress,
    });
    return session;
  }
}
