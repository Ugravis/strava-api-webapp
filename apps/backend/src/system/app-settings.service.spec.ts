// `@nestjs/typeorm` and `@nestjs/config` ship as ES modules Jest cannot
// require here: their decorator and helper are all the services need.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));
jest.mock('@nestjs/config', () => ({
  registerAs: (key: string, factory: () => unknown) =>
    Object.assign(factory, { KEY: key }),
}));

import type { Repository } from 'typeorm';
import type { AuthConfig } from '../config/auth.config';
import { User } from '../users/user.entity';
import type { AppSetting } from './app-setting.entity';
import { AppSettingsService } from './app-settings.service';
import { SystemSettingsService } from './system-settings.service';

function setup(rows: Partial<AppSetting>[] = [], env = { email: true }) {
  const repository = {
    find: jest.fn().mockResolvedValue(rows),
    upsert: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AppSettingsService(
    repository as unknown as Repository<AppSetting>,
    { emailSignInEnabled: env.email } as AuthConfig,
    { showcaseEnabled: true },
  );
  return { service, repository };
}

describe('AppSettingsService', () => {
  it('falls back on the catalog, the environment overriding its defaults', async () => {
    const { service } = setup([], { email: false });
    await expect(service.values()).resolves.toEqual({
      signupsEnabled: true,
      emailSignInEnabled: false,
      maxAccounts: null,
      profileShowcaseEnabled: true,
      pinnedBadgesMax: 5,
      stravaSyncEnabled: true,
    });
  });

  it('reads a stored value over the default, null included', async () => {
    const updatedAt = new Date('2026-11-17T10:00:00Z');
    const { service } = setup([
      { key: 'pinnedBadgesMax', value: 8, updatedAt },
      { key: 'emailSignInEnabled', value: true, updatedAt },
    ]);
    await expect(service.get('pinnedBadgesMax')).resolves.toBe(8);
    const list = await service.list();
    expect(list.find((each) => each.key === 'pinnedBadgesMax')).toEqual({
      key: 'pinnedBadgesMax',
      value: 8,
      defaultValue: 5,
      updatedAt: updatedAt.toISOString(),
    });
    expect(list.find((each) => each.key === 'maxAccounts')).toMatchObject({
      value: null,
      updatedAt: null,
    });
  });

  it('stores a value the catalog accepts and drops the cache', async () => {
    const { service, repository } = setup();
    await service.values();
    const version = service.version;
    await service.set('maxAccounts', 500);
    expect(repository.upsert).toHaveBeenCalledWith(
      { key: 'maxAccounts', value: 500 },
      ['key'],
    );
    expect(service.version).toBe(version + 1);
    await service.values();
    expect(repository.find).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['pinnedBadgesMax', 0],
    ['pinnedBadgesMax', 2.5],
    ['pinnedBadgesMax', null],
    ['signupsEnabled', 'yes'],
    ['maxAccounts', -1],
  ])('refuses %s = %p', async (key, value) => {
    const { service, repository } = setup();
    await expect(service.set(key, value)).rejects.toMatchObject({
      response: { code: 'INVALID_FIELD', field: 'value' },
    });
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('accepts no cap of accounts', async () => {
    const { service, repository } = setup();
    await service.set('maxAccounts', null);
    expect(repository.upsert).toHaveBeenCalled();
  });

  it('refuses an unknown setting', async () => {
    const { service } = setup();
    await expect(service.reset('nope')).rejects.toMatchObject({
      response: { code: 'NOT_FOUND' },
    });
  });
});

describe('SystemSettingsService sign-ups', () => {
  function system(rows: Partial<AppSetting>[], accounts: number) {
    const { service: appSettings } = setup(rows);
    const users = { count: jest.fn().mockResolvedValue(accounts) };
    return new SystemSettingsService(
      users as unknown as Repository<User>,
      appSettings,
    );
  }
  const at = new Date();

  it('closes the sign-ups once the cap of accounts is reached', async () => {
    const service = system(
      [{ key: 'maxAccounts', value: 3, updatedAt: at }],
      3,
    );
    expect((await service.status()).signupsEnabled).toBe(false);
    await expect(service.assertSignupsEnabled()).rejects.toMatchObject({
      response: { code: 'SIGNUPS_DISABLED' },
    });
  });

  it('keeps them open below the cap', async () => {
    const service = system(
      [{ key: 'maxAccounts', value: 3, updatedAt: at }],
      2,
    );
    await expect(service.assertSignupsEnabled()).resolves.toBeUndefined();
  });

  it('keeps them closed by the switch, whatever the count', async () => {
    const service = system(
      [{ key: 'signupsEnabled', value: false, updatedAt: at }],
      0,
    );
    expect((await service.status()).signupsEnabled).toBe(false);
  });
});

describe('SystemSettingsService maintenance', () => {
  it('keeps the start of the banner on a replacement, and takes it away', async () => {
    const since = '2026-11-17T08:00:00.000Z';
    const { service: appSettings, repository } = setup([
      {
        key: 'maintenance',
        value: { title: 'ongoing', description: null, since },
        updatedAt: new Date(since),
      },
    ]);
    const users = { count: jest.fn().mockResolvedValue(0) };
    const service = new SystemSettingsService(
      users as unknown as Repository<User>,
      appSettings,
    );
    expect((await service.status()).maintenance).toEqual({
      title: 'ongoing',
      description: null,
      since,
    });
    await service.setMaintenance('strava', 'Strava ne répond plus');
    expect(repository.upsert).toHaveBeenCalledWith(
      {
        key: 'maintenance',
        value: { title: 'strava', description: 'Strava ne répond plus', since },
      },
      ['key'],
    );
    await service.clearMaintenance();
    expect(repository.delete).toHaveBeenCalledWith({ key: 'maintenance' });
  });

  it('leaves the banner out of the settings', async () => {
    const { service } = setup([
      {
        key: 'maintenance',
        value: { title: 'ongoing', description: null, since: 'x' },
        updatedAt: new Date(),
      },
    ]);
    expect((await service.list()).map(({ key }) => key)).not.toContain(
      'maintenance',
    );
    await expect(service.set('maintenance', true)).rejects.toMatchObject({
      response: { code: 'NOT_FOUND' },
    });
  });
});
