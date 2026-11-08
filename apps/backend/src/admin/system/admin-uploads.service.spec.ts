import type { Repository } from 'typeorm';
import type { ObjectInfo, StorageService } from '../../storage/storage.service';
import type { User } from '../../users/user.entity';
import { AdminUploadsService } from './admin-uploads.service';

const HOUR_MS = 60 * 60 * 1000;
const owner = {
  id: 'user-id',
  username: 'jean',
  displayName: null,
  avatarKey: 'avatars/user-id/used.webp',
  externalAvatarUrl: null,
} as User;

function object(key: string, size: number, ageMs: number): ObjectInfo {
  return { key, size, lastModified: new Date(Date.now() - ageMs) };
}

describe('AdminUploadsService', () => {
  let storage: jest.Mocked<Pick<StorageService, 'list' | 'delete'>>;
  let service: AdminUploadsService;

  beforeEach(() => {
    storage = {
      list: jest.fn((prefix: string) =>
        Promise.resolve(
          prefix === 'avatars/'
            ? [
                object('avatars/user-id/used.webp', 300, 2 * HOUR_MS),
                object('avatars/user-id/old.webp', 200, 2 * HOUR_MS),
                object('avatars/user-id/new.webp', 100, 0),
              ]
            : [object('map-previews/user-id/a.webp', 50, 0)],
        ),
      ),
      delete: jest.fn(),
    };
    const users = { find: jest.fn().mockResolvedValue([owner]) };
    service = new AdminUploadsService(
      storage as unknown as StorageService,
      users as unknown as Repository<User>,
    );
  });

  it('weighs the avatars and tells the orphans apart from the used ones', async () => {
    const audit = await service.audit();

    expect(audit.avatars).toEqual({ count: 3, bytes: 600 });
    expect(audit.previews).toEqual({ count: 1, bytes: 50 });
    expect(audit.heaviest.map((file) => file.key)).toEqual([
      'avatars/user-id/used.webp',
    ]);
    expect(audit.heaviest[0].user?.username).toBe('jean');
    expect(audit.orphans.count).toBe(1);
    expect(audit.orphans.files[0]).toMatchObject({
      key: 'avatars/user-id/old.webp',
      user: null,
    });
  });

  it('deletes the old orphans only, never a file still on its way', async () => {
    await service.deleteOrphans();

    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenCalledWith('avatars/user-id/old.webp');
  });
});
