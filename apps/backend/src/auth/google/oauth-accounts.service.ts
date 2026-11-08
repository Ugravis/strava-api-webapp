import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthAccount, type OAuthProvider } from './oauth-account.entity';

@Injectable()
export class OAuthAccountsService {
  constructor(
    @InjectRepository(OAuthAccount)
    private readonly accounts: Repository<OAuthAccount>,
  ) {}

  findUserId(
    provider: OAuthProvider,
    providerAccountId: string,
  ): Promise<string | null> {
    return this.accounts
      .findOneBy({ provider, providerAccountId })
      .then((account) => account?.userId ?? null);
  }

  async link(
    userId: string,
    provider: OAuthProvider,
    providerAccountId: string,
  ): Promise<void> {
    await this.accounts.insert({ userId, provider, providerAccountId });
  }
}
