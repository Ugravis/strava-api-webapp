import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, Repository } from 'typeorm';
import authConfig, { type AuthConfig } from '../../config/auth.config';
import { generateToken, hashToken } from '../../common/crypto.util';
import { User } from '../../users/user.entity';
import { Session } from './session.entity';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Expiry is extended at most once per day to avoid a write on every request. */
const MAX_RENEWAL_INTERVAL_MS = DAY_MS;

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
  persistent: boolean;
}

export interface ValidatedSession {
  session: Session;
  user: User;
  /** True when the expiry was extended: a persistent cookie must be refreshed. */
  renewed: boolean;
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
    persistent: boolean,
  ): Promise<CreatedSession> {
    const token = generateToken();
    const now = new Date();
    const expiresAt = this.expiryFrom(now, persistent);
    await this.sessions.insert({
      tokenHash: hashToken(token),
      userId,
      persistent,
      expiresAt,
      lastSeenAt: now,
      userAgent: metadata.userAgent?.slice(0, 512) ?? null,
      ipAddress: metadata.ipAddress?.slice(0, 45) ?? null,
    });
    return { token, expiresAt, persistent };
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

    const renewed =
      now.getTime() - session.lastSeenAt.getTime() >
      this.renewalIntervalMs(session.persistent);
    if (renewed) {
      session.lastSeenAt = now;
      session.expiresAt = this.expiryFrom(now, session.persistent);
      await this.sessions.update(
        { id: session.id },
        { lastSeenAt: session.lastSeenAt, expiresAt: session.expiresAt },
      );
    }

    return { session, user: session.user, renewed };
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

  private ttlMs(persistent: boolean): number {
    return persistent
      ? this.config.sessionTtlDays * DAY_MS
      : this.config.browserSessionTtlHours * HOUR_MS;
  }

  /** A quarter of the lifetime, capped: short sessions are extended often enough. */
  private renewalIntervalMs(persistent: boolean): number {
    return Math.min(MAX_RENEWAL_INTERVAL_MS, this.ttlMs(persistent) / 4);
  }

  private expiryFrom(date: Date, persistent: boolean): Date {
    return new Date(date.getTime() + this.ttlMs(persistent));
  }
}
