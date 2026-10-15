import type { Readable } from 'node:stream';

export interface StoredObject {
  body: Readable;
  contentType: string | undefined;
  contentLength: number | undefined;
}

/** Object storage abstraction, so the backing service can change without touching callers. */
export abstract class StorageService {
  abstract put(key: string, body: Buffer, contentType: string): Promise<void>;
  abstract get(key: string): Promise<StoredObject | null>;
  abstract delete(key: string): Promise<void>;
  /** Deletes every object whose key starts with `prefix`; returns how many were removed. */
  abstract deleteAll(prefix?: string): Promise<number>;
}
