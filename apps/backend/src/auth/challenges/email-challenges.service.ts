import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import {
  DataSource,
  IsNull,
  LessThan,
  MoreThan,
  type EntityManager,
  type Repository,
} from 'typeorm';
import {
  VERIFICATION_CODE_TTL_MINUTES,
  type VerificationChallenge,
} from '@kilotrace/shared';
import authConfig, { type AuthConfig } from '../../config/auth.config';
import { MailService } from '../../mail/mail.service';
import { User } from '../../users/user.entity';
import {
  EmailChallenge,
  EmailChallengePurpose,
  type StoredCode,
} from './email-challenge.entity';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** Minimum time between two codes sent for the same challenge. */
export const RESEND_COOLDOWN_MS = 30 * 1000;
/** Codes sent to an address per purpose and per day at most, to keep its mailbox from being flooded. */
const MAX_SENDS_PER_WINDOW = 10;
const SEND_WINDOW_MS = 24 * HOUR_MS;
/** Wrong codes allowed before every code of the challenge is dropped. */
export const MAX_FAILED_ATTEMPTS = 5;
/** How long a sign-up waits for its code, so that it can be resumed from the sign-in. */
const CHALLENGE_TTL_MS: Record<EmailChallengePurpose, number> = {
  [EmailChallengePurpose.Signup]: 7 * 24 * HOUR_MS,
  [EmailChallengePurpose.PasswordReset]: HOUR_MS,
};

export interface StartChallengeInput {
  purpose: EmailChallengePurpose;
  email: string;
  userId?: string | null;
  username?: string | null;
  passwordHash?: string | null;
}

interface Delivery {
  challenge: EmailChallenge;
  code: string | null;
}

/**
 * Proves an email address with 6-digit codes. Codes are stored as keyed
 * hashes (HMAC): a plain hash of a million possible codes would be reversed
 * at once from a database leak. Mails are sent without being awaited, so the
 * response time never tells whether an account exists.
 */
@Injectable()
export class EmailChallengesService {
  private readonly logger = new Logger(EmailChallengesService.name);
  private readonly codeKey: Buffer;

  constructor(
    @InjectRepository(EmailChallenge)
    private readonly challenges: Repository<EmailChallenge>,
    private readonly dataSource: DataSource,
    private readonly mail: MailService,
    @Inject(authConfig.KEY) config: AuthConfig,
  ) {
    this.codeKey = createHmac('sha256', config.encryptionSecret)
      .update('email-challenge-codes')
      .digest();
  }

  /**
   * Opens the challenge of an address, or takes the one open, and sends a code
   * when allowed. A password reset asked again keeps its id and codes.
   */
  async start(input: StartChallengeInput): Promise<VerificationChallenge> {
    const now = new Date();
    await this.challenges.delete({ expiresAt: LessThan(now) });
    const { state, delivery } = await this.dataSource.transaction(
      async (manager) => {
        const where = { purpose: input.purpose, email: input.email };
        const lock = { mode: 'pessimistic_write' } as const;
        let challenge = await manager.findOne(EmailChallenge, { where, lock });
        if (!challenge) {
          await manager
            .createQueryBuilder()
            .insert()
            .into(EmailChallenge)
            .values({
              ...where,
              expiresAt: new Date(
                now.getTime() + CHALLENGE_TTL_MS[input.purpose],
              ),
            })
            .orIgnore()
            .execute();
          challenge = await manager.findOneOrFail(EmailChallenge, {
            where,
            lock,
          });
        } else if (input.purpose === EmailChallengePurpose.Signup) {
          // A new sign-up for the address replaces the one waiting: under a new id and
          // without its codes, so that nobody can set the password of a sign-up someone
          // else is verifying. The counters stay, the limits holding.
          const id = randomUUID();
          await manager.update(
            EmailChallenge,
            { id: challenge.id },
            { id, codes: [] },
          );
          challenge = await manager.findOneOrFail(EmailChallenge, {
            where: { id },
            lock,
          });
        }
        challenge.userId = input.userId ?? null;
        challenge.username = input.username ?? null;
        challenge.passwordHash = input.passwordHash ?? null;
        return this.sendIfAllowed(manager, challenge, now);
      },
    );
    this.deliver(delivery);
    return state;
  }

  /** Sends another code. An unknown challenge answers alike, so it reveals nothing. */
  async resend(challengeId: string): Promise<VerificationChallenge> {
    const now = new Date();
    const result = await this.dataSource.transaction(async (manager) => {
      const challenge = await manager.findOne(EmailChallenge, {
        where: { id: challengeId, expiresAt: MoreThan(now) },
        lock: { mode: 'pessimistic_write' },
      });
      return challenge ? this.sendIfAllowed(manager, challenge, now) : null;
    });
    if (!result) {
      return this.unknownState(challengeId, now);
    }
    this.deliver(result.delivery);
    return result.state;
  }

  /** What an address without challenge is answered, the same as a real one. */
  unknownState(
    challengeId: string = randomUUID(),
    now = new Date(),
  ): VerificationChallenge {
    return {
      challengeId,
      resendAvailableAt: new Date(
        now.getTime() + RESEND_COOLDOWN_MS,
      ).toISOString(),
    };
  }

  /**
   * The challenge a valid code answers, then removed so that it is used once;
   * else null, a wrong code counting towards the limit.
   */
  verify(
    challengeId: string,
    code: string,
    purpose: EmailChallengePurpose,
  ): Promise<EmailChallenge | null> {
    const now = new Date();
    return this.dataSource.transaction(async (manager) => {
      const challenge = await manager.findOne(EmailChallenge, {
        where: { id: challengeId, purpose, expiresAt: MoreThan(now) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!challenge) {
        return null;
      }
      const hash = Buffer.from(this.hashCode(challenge.id, code), 'hex');
      const codes = validCodes(challenge.codes, now);
      if (
        codes.some((stored) =>
          timingSafeEqual(Buffer.from(stored.hash, 'hex'), hash),
        )
      ) {
        await manager.delete(EmailChallenge, { id: challenge.id });
        return challenge;
      }
      challenge.failedAttempts += 1;
      challenge.codes = codes;
      if (challenge.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        // Every code is dropped: only a new one, sent within the daily limit, gives new tries.
        challenge.codes = [];
        challenge.failedAttempts = 0;
      }
      await manager.save(challenge);
      return null;
    });
  }

  /** Sign-ups waiting for their code under an email or a username, to resume them from the sign-in. */
  findPendingSignups(identifier: string): Promise<EmailChallenge[]> {
    const common = {
      purpose: EmailChallengePurpose.Signup,
      userId: IsNull(),
      expiresAt: MoreThan(new Date()),
    };
    return this.challenges.find({
      where: identifier.includes('@')
        ? { ...common, email: identifier }
        : { ...common, username: identifier },
      take: 5,
    });
  }

  private async sendIfAllowed(
    manager: EntityManager,
    challenge: EmailChallenge,
    now: Date,
  ): Promise<{ state: VerificationChallenge; delivery: Delivery | null }> {
    if (
      !challenge.sendWindowStartedAt ||
      now.getTime() - challenge.sendWindowStartedAt.getTime() >= SEND_WINDOW_MS
    ) {
      challenge.sendWindowStartedAt = now;
      challenge.sendCount = 0;
    }
    const cooledDown =
      !challenge.lastSentAt ||
      now.getTime() - challenge.lastSentAt.getTime() >= RESEND_COOLDOWN_MS;
    let delivery: Delivery | null = null;
    if (cooledDown && challenge.sendCount < MAX_SENDS_PER_WINDOW) {
      // An address already owning an account is warned, never sent a code.
      const warnsOwner =
        challenge.purpose === EmailChallengePurpose.Signup &&
        challenge.userId !== null;
      const code = warnsOwner ? null : generateCode();
      challenge.codes = validCodes(challenge.codes, now);
      if (code) {
        challenge.codes.push({
          hash: this.hashCode(challenge.id, code),
          expiresAt: new Date(
            now.getTime() + VERIFICATION_CODE_TTL_MINUTES * MINUTE_MS,
          ).toISOString(),
        });
      }
      challenge.sendCount += 1;
      challenge.lastSentAt = now;
      delivery = { challenge, code };
    }
    await manager.save(challenge);
    return { state: this.stateOf(challenge, now), delivery };
  }

  private stateOf(challenge: EmailChallenge, now: Date): VerificationChallenge {
    const next =
      challenge.sendCount >= MAX_SENDS_PER_WINDOW &&
      challenge.sendWindowStartedAt
        ? challenge.sendWindowStartedAt.getTime() + SEND_WINDOW_MS
        : (challenge.lastSentAt ?? now).getTime() + RESEND_COOLDOWN_MS;
    return {
      challengeId: challenge.id,
      resendAvailableAt: new Date(next).toISOString(),
    };
  }

  /** Not awaited: failures are logged, never returned to the caller. */
  private deliver(delivery: Delivery | null): void {
    if (delivery) {
      this.send(delivery).catch((error: unknown) =>
        this.logger.error(
          'Failed to prepare an email challenge mail',
          error instanceof Error ? error.stack : String(error),
        ),
      );
    }
  }

  private async send({ challenge, code }: Delivery): Promise<void> {
    const user = challenge.userId
      ? await this.challenges.manager.findOneBy(User, { id: challenge.userId })
      : null;
    if (challenge.purpose === EmailChallengePurpose.PasswordReset) {
      if (user && code) {
        await this.mail.sendPasswordResetCode(user, code);
      }
    } else if (user) {
      await this.mail.sendAccountExists(user);
    } else if (code && challenge.username) {
      await this.mail.sendSignupCode(
        {
          email: challenge.email,
          username: challenge.username,
          displayName: null,
        },
        code,
      );
    }
  }

  private hashCode(challengeId: string, code: string): string {
    return createHmac('sha256', this.codeKey)
      .update(`${challengeId}:${code}`)
      .digest('hex');
  }
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function validCodes(codes: StoredCode[], now: Date): StoredCode[] {
  return codes.filter((code) => new Date(code.expiresAt) > now);
}
