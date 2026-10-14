import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Readable } from 'node:stream';
import storageConfig, { type StorageConfig } from '../config/storage.config';
import { StorageService, type StoredObject } from './storage.service';

const BUCKET_CHECK_ATTEMPTS = 10;
const BUCKET_CHECK_DELAY_MS = 1000;

/** S3-compatible storage (AWS S3, RustFS, Cloudflare R2...). */
@Injectable()
export class S3StorageService extends StorageService implements OnModuleInit {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(@Inject(storageConfig.KEY) config: StorageConfig) {
    super();
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint ?? undefined,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  /** Ensures the bucket exists, retrying while the storage service starts up. */
  async onModuleInit(): Promise<void> {
    for (let attempt = 1; attempt <= BUCKET_CHECK_ATTEMPTS; attempt++) {
      try {
        await this.ensureBucket();
        return;
      } catch (error) {
        if (attempt === BUCKET_CHECK_ATTEMPTS) {
          this.logger.error(
            `Bucket "${this.bucket}" is unavailable`,
            error instanceof Error ? error.stack : String(error),
          );
          return;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, BUCKET_CHECK_DELAY_MS),
        );
      }
    }
  }

  private async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (!(error instanceof NotFound)) {
        throw error;
      }
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Created bucket "${this.bucket}"`);
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!(object.Body instanceof Readable)) {
        return null;
      }
      return {
        body: object.Body,
        contentType: object.ContentType,
        contentLength: object.ContentLength,
      };
    } catch (error) {
      if (error instanceof NoSuchKey) {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
