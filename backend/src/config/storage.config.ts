import { registerAs } from '@nestjs/config';

export interface StorageConfig {
  endpoint: string | null;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export default registerAs('storage', (): StorageConfig => ({
  endpoint: process.env.S3_ENDPOINT || null,
  region: process.env.S3_REGION ?? 'us-east-1',
  bucket: process.env.S3_BUCKET ?? 'strava-webapp',
  accessKeyId: process.env.S3_ACCESS_KEY ?? 'rustfsadmin',
  secretAccessKey: process.env.S3_SECRET_KEY ?? 'rustfsadmin',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
}));
