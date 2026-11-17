import {
  type AdminAppSetting,
  APP_SETTING_KEYS,
  APP_SETTINGS,
  type AppSettingKey,
  type AppSettingValues,
  checkAppSetting,
  type MaintenanceBanner,
} from '@kilotrace/shared';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import authConfig, { type AuthConfig } from '../config/auth.config';
import profilesConfig, { type ProfilesConfig } from '../config/profiles.config';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { AppSetting, MAINTENANCE_KEY } from './app-setting.entity';

/**
 * Read on most requests: kept in memory for a few seconds, so that another
 * instance of the backend sees a change soon.
 */
const CACHE_TTL_MS = 10_000;

/**
 * The settings of the site: the values stored from the back office, the
 * defaults of the catalog for the others, the environment overriding a few
 * of those defaults.
 */
@Injectable()
export class AppSettingsService {
  private cached: { rows: AppSetting[]; expiresAt: number } | null = null;
  /** Bumped by every change, so that the readers caching a value built on them rebuild it. */
  private changes = 0;

  constructor(
    @InjectRepository(AppSetting)
    private readonly settings: Repository<AppSetting>,
    @Inject(authConfig.KEY) private readonly auth: AuthConfig,
    @Inject(profilesConfig.KEY) private readonly profiles: ProfilesConfig,
  ) {}

  get version(): number {
    return this.changes;
  }

  async get<K extends AppSettingKey>(key: K): Promise<AppSettingValues[K]> {
    return (await this.values())[key];
  }

  async values(): Promise<AppSettingValues> {
    return Object.fromEntries(
      (await this.list()).map(({ key, value }) => [key, value]),
    ) as unknown as AppSettingValues;
  }

  /** Every setting of the catalog, its value, its default and its last change. */
  async list(): Promise<AdminAppSetting[]> {
    const defaults = this.defaults();
    const stored = new Map((await this.rows()).map((row) => [row.key, row]));
    return APP_SETTING_KEYS.map((key) => {
      const row = stored.get(key);
      return {
        key,
        // Written through `set`, checked against the catalog.
        value: row
          ? (row.value as AppSettingValues[typeof key])
          : defaults[key],
        defaultValue: defaults[key],
        updatedAt: row ? row.updatedAt.toISOString() : null,
      };
    });
  }

  /** The banner shown above the pages of the signed-in users, null while none is. */
  async maintenance(): Promise<MaintenanceBanner | null> {
    const row = (await this.rows()).find(({ key }) => key === MAINTENANCE_KEY);
    return (row?.value as MaintenanceBanner | undefined) ?? null;
  }

  /** Shows `banner`, or takes it away with null. */
  async setMaintenance(banner: MaintenanceBanner | null): Promise<void> {
    if (banner) {
      await this.settings.upsert({ key: MAINTENANCE_KEY, value: banner }, [
        'key',
      ]);
    } else {
      await this.settings.delete({ key: MAINTENANCE_KEY });
    }
    this.changed();
  }

  /** Stores `value`, refused unless the catalog accepts it. */
  async set(key: string, value: unknown): Promise<void> {
    const known = this.known(key);
    const error = checkAppSetting(known, value);
    if (error) {
      throw new BadRequestException({
        code: ApiErrorCode.InvalidField,
        field: 'value',
        message: error,
      });
    }
    await this.settings.upsert(
      { key: known, value: value as AppSetting['value'] },
      ['key'],
    );
    this.changed();
  }

  /** Puts the default back. */
  async reset(key: string): Promise<void> {
    await this.settings.delete({ key: this.known(key) });
    this.changed();
  }

  /** The defaults of the catalog, the environment overriding the ones set at deploy time. */
  private defaults(): AppSettingValues {
    const defaults = Object.fromEntries(
      APP_SETTING_KEYS.map((key) => [key, APP_SETTINGS[key].default]),
    ) as unknown as AppSettingValues;
    return {
      ...defaults,
      emailSignInEnabled: this.auth.emailSignInEnabled,
      profileShowcaseEnabled: this.profiles.showcaseEnabled,
    };
  }

  private known(key: string): AppSettingKey {
    if (!(APP_SETTING_KEYS as string[]).includes(key)) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such setting');
    }
    return key as AppSettingKey;
  }

  private async rows(): Promise<AppSetting[]> {
    if (this.cached && this.cached.expiresAt > Date.now()) {
      return this.cached.rows;
    }
    const rows = await this.settings.find();
    this.cached = { rows, expiresAt: Date.now() + CACHE_TTL_MS };
    return rows;
  }

  private changed(): void {
    this.cached = null;
    this.changes++;
  }
}
