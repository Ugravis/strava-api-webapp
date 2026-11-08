import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { StorageService, type StoredObject } from '../storage/storage.service';
import type { User } from './user.entity';
import { UsersService } from './users.service';

const AVATAR_SIZE = 256;
const AVATAR_CONTENT_TYPE = 'image/webp';
export const AVATAR_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const AVATAR_FILE_NAME_PATTERN = /^[a-f0-9]{16}\.webp$/;

@Injectable()
export class AvatarsService {
  private readonly logger = new Logger(AvatarsService.name);

  constructor(
    private readonly storage: StorageService,
    private readonly users: UsersService,
  ) {}

  /**
   * Normalizes the upload (orientation, square crop, WebP) and stores it under a
   * random name, so the public URL changes on each upload and can be cached forever.
   */
  async upload(user: User, file: Buffer): Promise<string> {
    const image = await this.process(file);
    const key = `avatars/${user.id}/${randomBytes(8).toString('hex')}.webp`;
    await this.storage.put(key, image, AVATAR_CONTENT_TYPE);
    await this.users.setAvatarKey(user.id, key);
    await this.deleteQuietly(user.avatarKey);
    user.avatarKey = key;
    return key;
  }

  async remove(user: User): Promise<void> {
    await this.users.setAvatarKey(user.id, null);
    await this.deleteQuietly(user.avatarKey);
    user.avatarKey = null;
  }

  get(userId: string, fileName: string): Promise<StoredObject | null> {
    return this.storage.get(`avatars/${userId}/${fileName}`);
  }

  async deleteQuietly(key: string | null): Promise<void> {
    if (!key) {
      return;
    }
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.warn(
        `Failed to delete avatar ${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async process(file: Buffer): Promise<Buffer> {
    try {
      return await sharp(file, { limitInputPixels: 50_000_000 })
        .rotate()
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw ApiErrors.badRequest(
        ApiErrorCode.InvalidImage,
        'The file is not a valid image',
      );
    }
  }
}
