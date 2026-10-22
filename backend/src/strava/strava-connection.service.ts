import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ActivitiesService } from '../activities/activities.service';
import { SecretBox } from '../common/secret-box';
import authConfig, { type AuthConfig } from '../config/auth.config';
import { ProviderConnection } from '../connections/provider-connection.entity';
import { SyncJobsService } from '../connections/sync-jobs.service';
import { StravaApiClient } from './api/strava-api.client';
import { StravaAuthorizationRevokedError } from './api/strava-api.errors';
import type {
  StravaAthleteSummary,
  StravaTokenResponse,
} from './api/strava-api.types';

const PROVIDER = 'strava';

/** The Strava athlete is already linked to another user of the platform. */
export class StravaAccountLinkedElsewhereError extends Error {
  constructor() {
    super('This Strava account is linked to another user');
    this.name = 'StravaAccountLinkedElsewhereError';
  }
}
/** Access tokens are refreshed a little before they expire (they last 6 hours). */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

function athleteName(athlete: StravaAthleteSummary | undefined): string | null {
  const name = [athlete?.firstname, athlete?.lastname]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name ? name.slice(0, 255) : null;
}

@Injectable()
export class StravaConnectionService {
  private readonly logger = new Logger(StravaConnectionService.name);
  private readonly secretBox: SecretBox;

  constructor(
    @InjectRepository(ProviderConnection)
    private readonly connections: Repository<ProviderConnection>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly api: StravaApiClient,
    private readonly activities: ActivitiesService,
    private readonly syncJobs: SyncJobsService,
    @Inject(authConfig.KEY) config: AuthConfig,
  ) {
    this.secretBox = new SecretBox(config.encryptionSecret);
  }

  findForUser(userId: string): Promise<ProviderConnection | null> {
    return this.connections.findOneBy({ userId, provider: PROVIDER });
  }

  findByAthlete(athleteId: string): Promise<ProviderConnection | null> {
    return this.connections.findOneBy({
      provider: PROVIDER,
      providerAccountId: athleteId,
    });
  }

  findById(id: string): Promise<ProviderConnection | null> {
    return this.connections.findOneBy({ id });
  }

  /** Links the athlete who granted `code` to the user and starts the import. */
  async connect(
    userId: string,
    code: string,
    scopes: string[],
  ): Promise<ProviderConnection> {
    const tokens = await this.api.exchangeCode(code);
    if (!tokens.athlete) {
      throw new Error('Strava did not return the athlete');
    }
    const athleteId = String(tokens.athlete.id);

    const linked = await this.findByAthlete(athleteId);
    if (linked && linked.userId !== userId) {
      throw new StravaAccountLinkedElsewhereError();
    }
    const existing = await this.findForUser(userId);
    if (existing && existing.providerAccountId !== athleteId) {
      // Another Strava account replaces the current one: its data goes away.
      await this.remove(existing);
    }

    await this.connections.upsert(
      {
        userId,
        provider: PROVIDER,
        providerAccountId: athleteId,
        accountName: athleteName(tokens.athlete),
        scopes,
        ...this.encryptTokens(tokens),
      },
      ['userId', 'provider'],
    );
    const connection = await this.findForUser(userId);
    if (!connection) {
      throw new Error('Strava connection was not saved');
    }
    await this.syncJobs.enqueue(
      connection.id,
      connection.lastSyncedAt ? 'reconcile' : 'backfill',
    );
    return connection;
  }

  /**
   * Disconnects Strava at the user's request: revokes the tokens at Strava,
   * then deletes the connection and every activity imported from it.
   */
  async disconnect(userId: string): Promise<void> {
    const connection = await this.findForUser(userId);
    if (!connection) {
      return;
    }
    try {
      await this.api.revoke(
        this.secretBox.decrypt(connection.refreshTokenEncrypted),
      );
    } catch (error) {
      // The local data is deleted anyway; the athlete can still revoke from Strava.
      this.logger.warn(
        `Strava token revocation failed for connection ${connection.id}: ${String(error)}`,
      );
    }
    await this.remove(connection);
  }

  /** The athlete revoked the access from Strava: their data must be deleted. */
  async handleRevoked(connection: ProviderConnection): Promise<void> {
    this.logger.log(
      `Strava access revoked for connection ${connection.id}, deleting its data`,
    );
    await this.remove(connection);
  }

  /**
   * Returns a valid access token, refreshing it when it expires soon. The row
   * lock serializes concurrent refreshes: Strava invalidates the previous
   * refresh token as soon as a new one is issued.
   * @throws StravaAuthorizationRevokedError when Strava rejects the refresh token.
   */
  accessToken(connectionId: string, { force = false } = {}): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const connection = await manager.findOne(ProviderConnection, {
        where: { id: connectionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!connection) {
        throw new StravaAuthorizationRevokedError();
      }
      const expiresSoon =
        connection.accessTokenExpiresAt.getTime() - Date.now() <
        REFRESH_MARGIN_MS;
      if (!force && !expiresSoon) {
        return this.secretBox.decrypt(connection.accessTokenEncrypted);
      }
      const tokens = await this.api.refreshToken(
        this.secretBox.decrypt(connection.refreshTokenEncrypted),
      );
      await manager.update(
        ProviderConnection,
        connection.id,
        this.encryptTokens(tokens),
      );
      return tokens.access_token;
    });
  }

  async markSynced(connectionId: string): Promise<void> {
    await this.connections.update(connectionId, { lastSyncedAt: new Date() });
  }

  /** Connections whose last synchronization is older than `date`. */
  findSyncedBefore(date: Date): Promise<ProviderConnection[]> {
    return this.connections
      .createQueryBuilder('connection')
      .where('connection.provider = :provider', { provider: PROVIDER })
      .andWhere(
        '(connection.last_synced_at IS NULL OR connection.last_synced_at < :date)',
        { date },
      )
      .getMany();
  }

  private async remove(connection: ProviderConnection): Promise<void> {
    await this.activities.removeFromProvider(connection.userId, PROVIDER);
    // Sync jobs are removed by cascade.
    await this.connections.delete(connection.id);
  }

  private encryptTokens(
    tokens: StravaTokenResponse,
  ): Pick<
    ProviderConnection,
    'accessTokenEncrypted' | 'refreshTokenEncrypted' | 'accessTokenExpiresAt'
  > {
    return {
      accessTokenEncrypted: this.secretBox.encrypt(tokens.access_token),
      refreshTokenEncrypted: this.secretBox.encrypt(tokens.refresh_token),
      accessTokenExpiresAt: new Date(tokens.expires_at * 1000),
    };
  }
}
