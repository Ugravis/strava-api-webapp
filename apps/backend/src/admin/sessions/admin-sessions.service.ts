import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateToken, hashToken } from '../../common/crypto.util';
import type { AdminUser } from '../users/admin-user.entity';
import { AdminSession } from './admin-session.entity';

const MINUTE_MS = 60 * 1000;
/** Signed out after this idle time. */
export const ADMIN_SESSION_IDLE_MS = 30 * MINUTE_MS;
/** Signed out after this time, even when active. */
export const ADMIN_SESSION_MAX_AGE_MS = 8 * 60 * MINUTE_MS;
/** Activity is recorded at most once a minute to avoid a write per request. */
const LAST_SEEN_INTERVAL_MS = MINUTE_MS;

export interface AdminSessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface CreatedAdminSession {
  token: string;
  expiresAt: Date;
}

export interface ValidatedAdminSession {
  session: AdminSession;
  /** Loaded with the session on every request: role changes apply at once. */
  admin: AdminUser;
}

@Injectable()
export class AdminSessionsService {
  constructor(
    @InjectRepository(AdminSession)
    private readonly sessions: Repository<AdminSession>,
  ) {}

  async create(
    adminUserId: string,
    metadata: AdminSessionMetadata,
  ): Promise<CreatedAdminSession> {
    const token = generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ADMIN_SESSION_MAX_AGE_MS);
    await this.sessions.insert({
      tokenHash: hashToken(token),
      adminUserId,
      expiresAt,
      lastSeenAt: now,
      userAgent: metadata.userAgent?.slice(0, 512) ?? null,
      ipAddress: metadata.ipAddress?.slice(0, 45) ?? null,
    });
    return { token, expiresAt };
  }

  /** Resolves a token to an active session of an enabled back-office user. */
  async validate(token: string): Promise<ValidatedAdminSession | null> {
    const session = await this.sessions.findOne({
      where: { tokenHash: hashToken(token) },
      relations: { adminUser: true },
    });
    if (!session?.adminUser) {
      return null;
    }

    const now = Date.now();
    const idle = now - session.lastSeenAt.getTime() > ADMIN_SESSION_IDLE_MS;
    if (idle || session.expiresAt.getTime() <= now) {
      await this.sessions.delete({ id: session.id });
      return null;
    }
    if (session.adminUser.disabledAt) {
      await this.revokeAllFor(session.adminUserId);
      return null;
    }

    if (now - session.lastSeenAt.getTime() > LAST_SEEN_INTERVAL_MS) {
      session.lastSeenAt = new Date(now);
      await this.sessions.update(
        { id: session.id },
        { lastSeenAt: session.lastSeenAt },
      );
    }
    return { session, admin: session.adminUser };
  }

  async revoke(token: string): Promise<void> {
    await this.sessions.delete({ tokenHash: hashToken(token) });
  }

  async revokeAllFor(adminUserId: string): Promise<void> {
    await this.sessions.delete({ adminUserId });
  }
}
