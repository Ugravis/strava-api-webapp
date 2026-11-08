import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import { compressText, decompressText } from "./compression";

const DB_NAME = "activity-tracks";
const DB_VERSION = 1;
const OWNER_KEY = "owner";

export interface ActivityTrack {
  activityId: string;
  /** Google encoded polyline, or null when the activity has no GPS track. */
  polyline: string | null;
}

interface StoredTrack {
  activityId: string;
  /** Compressed encoded polyline. */
  data: Uint8Array<ArrayBuffer> | null;
}

interface TrackSchema extends DBSchema {
  tracks: { key: string; value: StoredTrack };
  meta: { key: string; value: string };
}

/**
 * Activity tracks kept in the browser only: the Strava API Policy forbids
 * storing location data on the server.
 */
export interface TrackStore {
  all(): Promise<ActivityTrack[]>;
  /** Identifiers of the stored activities, without reading the tracks. */
  ids(): Promise<string[]>;
  putMany(tracks: ActivityTrack[]): Promise<void>;
  deleteMany(activityIds: string[]): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Opens the database for `userId`. Tracks left by another account on the
 * same browser are discarded: a user's data is shown to that user only.
 */
async function openOwnedDatabase(userId: string, onClosed: () => void): Promise<IDBPDatabase<TrackSchema>> {
  const db = await openDB<TrackSchema>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore("tracks", { keyPath: "activityId" });
      database.createObjectStore("meta");
    },
    // Another tab or `clearTrackStore` deletes the database: the connection
    // is released so that the deletion is not blocked.
    blocking() {
      db.close();
      onClosed();
    },
    terminated: onClosed,
  });
  const tx = db.transaction(["tracks", "meta"], "readwrite");
  const owner = await tx.objectStore("meta").get(OWNER_KEY);
  if (owner !== userId) {
    await tx.objectStore("tracks").clear();
    await tx.objectStore("meta").put(userId, OWNER_KEY);
  }
  await tx.done;
  return db;
}

class IndexedDbTrackStore implements TrackStore {
  private connection: Promise<IDBPDatabase<TrackSchema>> | null = null;

  constructor(private readonly userId: string) {}

  /** Reopens the database when it was closed for a deletion. */
  database(): Promise<IDBPDatabase<TrackSchema>> {
    this.connection ??= openOwnedDatabase(this.userId, () => {
      this.connection = null;
    });
    return this.connection;
  }

  async all(): Promise<ActivityTrack[]> {
    const stored = await (await this.database()).getAll("tracks");
    return Promise.all(
      stored.map(async ({ activityId, data }) => ({
        activityId,
        polyline: data ? await decompressText(data) : null,
      })),
    );
  }

  async ids(): Promise<string[]> {
    return (await this.database()).getAllKeys("tracks");
  }

  async putMany(tracks: ActivityTrack[]): Promise<void> {
    // Compression is asynchronous: it must end before the transaction starts,
    // which would otherwise commit as soon as it is left idle.
    const stored = await Promise.all(
      tracks.map(async ({ activityId, polyline }) => ({
        activityId,
        data: polyline ? await compressText(polyline) : null,
      })),
    );
    const tx = (await this.database()).transaction("tracks", "readwrite");
    await Promise.all([...stored.map((track) => tx.store.put(track)), tx.done]);
  }

  async deleteMany(activityIds: string[]): Promise<void> {
    const tx = (await this.database()).transaction("tracks", "readwrite");
    await Promise.all([...activityIds.map((id) => tx.store.delete(id)), tx.done]);
  }

  async clear(): Promise<void> {
    await (await this.database()).clear("tracks");
  }
}

/** Fallback when IndexedDB is unavailable: tracks last until the page is left. */
export class MemoryTrackStore implements TrackStore {
  private readonly tracks = new Map<string, string | null>();

  async all(): Promise<ActivityTrack[]> {
    return [...this.tracks].map(([activityId, polyline]) => ({ activityId, polyline }));
  }

  async ids(): Promise<string[]> {
    return [...this.tracks.keys()];
  }

  async putMany(tracks: ActivityTrack[]): Promise<void> {
    for (const { activityId, polyline } of tracks) this.tracks.set(activityId, polyline);
  }

  async deleteMany(activityIds: string[]): Promise<void> {
    for (const id of activityIds) this.tracks.delete(id);
  }

  async clear(): Promise<void> {
    this.tracks.clear();
  }
}

/** Store of `userId`, in memory when IndexedDB is unavailable (e.g. private browsing). */
export async function openTrackStore(userId: string): Promise<TrackStore> {
  const store = new IndexedDbTrackStore(userId);
  try {
    await store.database();
    return store;
  } catch {
    return new MemoryTrackStore();
  }
}

/** Deletes every track kept in this browser, e.g. on sign-out. */
export async function clearTrackStore(): Promise<void> {
  try {
    await deleteDB(DB_NAME);
  } catch {
    // IndexedDB may be unavailable (private browsing): nothing was stored.
  }
}
