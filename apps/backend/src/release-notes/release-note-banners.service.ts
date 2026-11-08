import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { StorageService, type StoredObject } from '../storage/storage.service';

/** Wide enough for the popup and the history on a large screen. */
const BANNER_WIDTH = 1600;
const BANNER_CONTENT_TYPE = 'image/webp';
const BANNERS_PREFIX = 'release-notes/banners/';
export const BANNER_FILE_NAME_PATTERN = /^[a-f0-9]{16}\.webp$/;

/**
 * The banner images of the release notes: normalized (orientation, at most
 * 1600 px wide, WebP) and stored under a random name, so that their address
 * changes on each upload and is cached forever.
 */
@Injectable()
export class ReleaseNoteBannersService {
  private readonly logger = new Logger(ReleaseNoteBannersService.name);

  constructor(private readonly storage: StorageService) {}

  /** Stores the image, answering its key. */
  async store(file: Buffer): Promise<string> {
    const key = `${BANNERS_PREFIX}${randomBytes(8).toString('hex')}.webp`;
    await this.storage.put(key, await this.process(file), BANNER_CONTENT_TYPE);
    return key;
  }

  get(fileName: string): Promise<StoredObject | null> {
    return this.storage.get(`${BANNERS_PREFIX}${fileName}`);
  }

  async deleteQuietly(key: string | null): Promise<void> {
    if (!key) return;
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.warn(`Failed to delete banner ${key}: ${String(error)}`);
    }
  }

  private async process(file: Buffer): Promise<Buffer> {
    try {
      return await sharp(file, { limitInputPixels: 50_000_000 })
        .rotate()
        .resize({ width: BANNER_WIDTH, withoutEnlargement: true })
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
