import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { generateToken, hashToken } from '../../common/crypto.util';
import { UserToken, UserTokenPurpose } from './user-token.entity';

@Injectable()
export class UserTokensService {
  constructor(
    @InjectRepository(UserToken)
    private readonly tokens: Repository<UserToken>,
  ) {}

  /** Issues a new token and invalidates the previous ones with the same purpose. */
  async issue(
    userId: string,
    purpose: UserTokenPurpose,
    ttlMs: number,
  ): Promise<string> {
    await this.tokens.delete({ userId, purpose });
    const token = generateToken();
    await this.tokens.insert({
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return token;
  }

  /**
   * Marks a valid token as consumed and returns its owner id.
   * The conditional update guarantees a token can only be consumed once.
   */
  async consume(
    token: string,
    purpose: UserTokenPurpose,
  ): Promise<string | null> {
    const tokenHash = hashToken(token);
    const result = await this.tokens.update(
      {
        tokenHash,
        purpose,
        consumedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      { consumedAt: new Date() },
    );
    if (!result.affected) {
      return null;
    }
    const consumed = await this.tokens.findOneBy({ tokenHash });
    return consumed?.userId ?? null;
  }
}
