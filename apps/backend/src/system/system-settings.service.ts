import type {
  AppSettingValues,
  MaintenanceBanner,
  MaintenanceTitle,
  SystemStatusResponse,
} from '@kilotrace/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { User } from '../users/user.entity';
import { AppSettingsService } from './app-settings.service';
import { SystemSettings } from './system-settings.entity';

const SETTINGS_ID = 1;

/**
 * Read by every page of the signed-in users: kept in memory for a few
 * seconds, so that another instance of the backend sees a change soon.
 */
const CACHE_TTL_MS = 10_000;

@Injectable()
export class SystemSettingsService {
  private cached: {
    status: SystemStatusResponse;
    expiresAt: number;
    /** Version of the settings it was built on. */
    settings: number;
  } | null = null;

  constructor(
    @InjectRepository(SystemSettings)
    private readonly settings: Repository<SystemSettings>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly appSettings: AppSettingsService,
  ) {}

  async status(): Promise<SystemStatusResponse> {
    if (
      this.cached &&
      this.cached.expiresAt > Date.now() &&
      this.cached.settings === this.appSettings.version
    ) {
      return this.cached.status;
    }
    const version = this.appSettings.version;
    const values = await this.appSettings.values();
    const status: SystemStatusResponse = {
      maintenance: toMaintenance(await this.read()),
      signupsEnabled: await this.signupsOpen(values),
      emailSignInEnabled: values.emailSignInEnabled,
      profileShowcaseEnabled: values.profileShowcaseEnabled,
    };
    this.cached = {
      status,
      expiresAt: Date.now() + CACHE_TTL_MS,
      settings: version,
    };
    return status;
  }

  /**
   * Refuses the creation of an account while the sign-ups are closed, or
   * once the cap of accounts is reached: counted afresh, not from the cache.
   */
  async assertSignupsEnabled(): Promise<void> {
    if (!(await this.signupsOpen(await this.appSettings.values()))) {
      throw ApiErrors.forbidden(
        ApiErrorCode.SignupsDisabled,
        'Sign-ups are closed for now',
      );
    }
  }

  /** Shows the banner, or replaces it; its start is kept on a replacement. */
  async setMaintenance(
    title: MaintenanceTitle,
    description: string | null,
  ): Promise<void> {
    const current = await this.read();
    await this.write({
      maintenanceTitle: title,
      maintenanceDescription: description,
      maintenanceSince: current.maintenanceSince ?? new Date(),
    });
  }

  clearMaintenance(): Promise<void> {
    return this.write({
      maintenanceTitle: null,
      maintenanceDescription: null,
      maintenanceSince: null,
    });
  }

  private async signupsOpen(values: AppSettingValues): Promise<boolean> {
    if (!values.signupsEnabled) {
      return false;
    }
    return (
      values.maxAccounts === null ||
      (await this.users.count()) < values.maxAccounts
    );
  }

  /** The row is inserted by the migration; the defaults stand in for it otherwise. */
  private async read(): Promise<SystemSettings> {
    return (
      (await this.settings.findOneBy({ id: SETTINGS_ID })) ??
      this.settings.create({
        id: SETTINGS_ID,
        maintenanceTitle: null,
        maintenanceDescription: null,
        maintenanceSince: null,
      })
    );
  }

  private async write(fields: Partial<SystemSettings>): Promise<void> {
    await this.settings.upsert({ id: SETTINGS_ID, ...fields }, ['id']);
    this.cached = null;
  }
}

function toMaintenance(settings: SystemSettings): MaintenanceBanner | null {
  const { maintenanceTitle, maintenanceDescription, maintenanceSince } =
    settings;
  return maintenanceTitle && maintenanceSince
    ? {
        title: maintenanceTitle,
        description: maintenanceDescription,
        since: maintenanceSince.toISOString(),
      }
    : null;
}
