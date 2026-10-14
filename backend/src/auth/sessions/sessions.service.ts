import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, Repository } from 'typeorm';
import authConfig, { type AuthConfig } from '../../config/auth.config';
import { generateToken, hashToken } from '../../common/crypto.util';
import { User } from '../../users/user.entity';
import { Session } from './session.entity';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Expiry is extended at most once per day to avoid a write on every request. */
const RENEWAL_INTERVAL_MS = DAY_MS;

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export interface ValidatedSession {
  session: Session;
  user: User;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
    @Inject(authConfig.KEY)
    private readonly config: AuthConfig,
  ) {}

  async create(
    userId: string,
    metadata: SessionMetadata,
  ): Promise<CreatedSession> {
    const token = generateToken();
    const now = new Date();
    const expiresAt = this.expiryFrom(now);
    await this.sessions.insert({
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      lastSeenAt: now,
      userAgent: metadata.userAgent?.slice(0, 512) ?? null,
      ipAddress: metadata.ipAddress?.slice(0, 45) ?? null,
    });
    return { token, expiresAt };
  }

  /** Resolves a session token, applying sliding expiration. */
  async validate(token: string): Promise<ValidatedSession | null> {
    const session = await this.sessions.findOne({
      where: { tokenHash: hashToken(token) },
      relations: { user: true },
    });
    if (!session?.user) {
      return null;
    }

    const now = new Date();
    if (session.expiresAt <= now) {
      await this.sessions.delete({ id: session.id });
      return null;
    }

    if (now.getTime() - session.lastSeenAt.getTime() > RENEWAL_INTERVAL_MS) {
      session.lastSeenAt = now;
      session.expiresAt = this.expiryFrom(now);
      await this.sessions.update(
        { id: session.id },
        { lastSeenAt: session.lastSeenAt, expiresAt: session.expiresAt },
      );
    }

    return { session, user: session.user };
  }

  async revoke(token: string): Promise<void> {
    await this.sessions.delete({ tokenHash: hashToken(token) });
  }

  /** Revokes every session of a user, optionally keeping the current one. */
  async revokeAllForUser(
    userId: string,
    exceptSessionId?: string,
  ): Promise<void> {
    await this.sessions.delete(
      exceptSessionId ? { userId, id: Not(exceptSessionId) } : { userId },
    );
  }

  async purgeExpired(): Promise<void> {
    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
  }

  private expiryFrom(date: Date): Date {
    return new Date(date.getTime() + this.config.sessionTtlDays * DAY_MS);
  }
}
