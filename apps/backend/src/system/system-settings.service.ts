import type { MaintenanceTitle, SystemStatusResponse } from '@kilotrace/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { SystemSettings } from './system-settings.entity';

const SETTINGS_ID = 1;

/**
 * Read by every page of the signed-in users: kept in memory for a few
 * seconds, so that another instance of the backend sees a change soon.
 */
const CACHE_TTL_MS = 10_000;

@Injectable()
export class SystemSettingsService {
  private cached: { status: SystemStatusResponse; expiresAt: number } | null =
    null;

  constructor(
    @InjectRepository(SystemSettings)
    private readonly settings: Repository<SystemSettings>,
  ) {}

  async status(): Promise<SystemStatusResponse> {
    if (this.cached && this.cached.expiresAt > Date.now()) {
      return this.cached.status;
    }
    const status = toStatus(await this.read());
    this.cached = { status, expiresAt: Date.now() + CACHE_TTL_MS };
    return status;
  }

  /** Refuses the creation of an account while the sign-ups are closed. */
  async assertSignupsEnabled(): Promise<void> {
    if (!(await this.status()).signupsEnabled) {
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

  setSignupsEnabled(enabled: boolean): Promise<void> {
    return this.write({ signupsEnabled: enabled });
  }

  /** The row is inserted by the migration; the defaults stand in for it otherwise. */
  private async read(): Promise<SystemSettings> {
    return (
      (await this.settings.findOneBy({ id: SETTINGS_ID })) ??
      this.settings.create({
        id: SETTINGS_ID,
        signupsEnabled: true,
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

function toStatus(settings: SystemSettings): SystemStatusResponse {
  const { maintenanceTitle, maintenanceDescription, maintenanceSince } =
    settings;
  return {
    maintenance:
      maintenanceTitle && maintenanceSince
        ? {
            title: maintenanceTitle,
            description: maintenanceDescription,
            since: maintenanceSince.toISOString(),
          }
        : null,
    signupsEnabled: settings.signupsEnabled,
  };
}
