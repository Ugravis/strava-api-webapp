import type {
  AdminStorageTotal,
  AdminUploadFile,
  AdminUploadsAudit,
} from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { type ObjectInfo, StorageService } from '../../storage/storage.service';
import { User } from '../../users/user.entity';
import { toAuditUser } from '../common/audit-user';

const AVATARS_PREFIX = 'avatars/';
const PREVIEWS_PREFIX = 'map-previews/';
const HEAVIEST_LIMIT = 20;
const ORPHANS_SHOWN = 50;

/**
 * An avatar is stored before the account points to it: a younger file
 * without an owner may still be on its way, never an orphan.
 */
const ORPHAN_MIN_AGE_MS = 60 * 60 * 1000;

/** Weight of the files in the storage, and cleaning of the lost avatars. */
@Injectable()
export class AdminUploadsService {
  constructor(
    private readonly storage: StorageService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async audit(): Promise<AdminUploadsAudit> {
    const [avatars, previews, owners] = await Promise.all([
      this.storage.list(AVATARS_PREFIX),
      this.storage.list(PREVIEWS_PREFIX),
      this.avatarOwners(),
    ]);
    const heaviest = avatars
      .filter((object) => owners.has(object.key))
      .sort(byWeight)
      .slice(0, HEAVIEST_LIMIT)
      .map((object) => toFile(object, owners.get(object.key)));
    const orphans = orphansOf(avatars, owners);
    return {
      avatars: totalOf(avatars),
      heaviest,
      orphans: {
        ...totalOf(orphans),
        files: orphans
          .sort(byWeight)
          .slice(0, ORPHANS_SHOWN)
          .map((object) => toFile(object, undefined)),
      },
      previews: totalOf(previews),
    };
  }

  /** Deletes the orphan avatars found now, whatever the page showed. */
  async deleteOrphans(): Promise<void> {
    const [avatars, owners] = await Promise.all([
      this.storage.list(AVATARS_PREFIX),
      this.avatarOwners(),
    ]);
    for (const object of orphansOf(avatars, owners)) {
      await this.storage.delete(object.key);
    }
  }

  /** The accounts by the key of their avatar. */
  private async avatarOwners(): Promise<Map<string, User>> {
    const users = await this.users.find({
      where: { avatarKey: Not(IsNull()) },
    });
    return new Map(users.map((user) => [user.avatarKey ?? '', user]));
  }
}

function orphansOf(
  objects: ObjectInfo[],
  owners: Map<string, User>,
): ObjectInfo[] {
  const before = Date.now() - ORPHAN_MIN_AGE_MS;
  return objects.filter(
    (object) =>
      !owners.has(object.key) && (object.lastModified?.getTime() ?? 0) < before,
  );
}

function totalOf(objects: ObjectInfo[]): AdminStorageTotal {
  return {
    count: objects.length,
    bytes: objects.reduce((sum, object) => sum + object.size, 0),
  };
}

function byWeight(a: ObjectInfo, b: ObjectInfo): number {
  return b.size - a.size;
}

function toFile(object: ObjectInfo, owner: User | undefined): AdminUploadFile {
  return {
    key: object.key,
    bytes: object.size,
    lastModified: object.lastModified?.toISOString() ?? null,
    user: owner ? toAuditUser(owner.id, owner) : null,
  };
}
