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
}

class IndexedDbTrackStore implements TrackStore {
  constructor(private readonly db: IDBPDatabase<TrackSchema>) {}

  async all(): Promise<ActivityTrack[]> {
    const stored = await this.db.getAll("tracks");
    return Promise.all(
      stored.map(async ({ activityId, data }) => ({
        activityId,
        polyline: data ? await decompressText(data) : null,
      })),
    );
  }

  ids(): Promise<string[]> {
    return this.db.getAllKeys("tracks");
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
    const tx = this.db.transaction("tracks", "readwrite");
    await Promise.all([...stored.map((track) => tx.store.put(track)), tx.done]);
  }

  async deleteMany(activityIds: string[]): Promise<void> {
    const tx = this.db.transaction("tracks", "readwrite");
    await Promise.all([...activityIds.map((id) => tx.store.delete(id)), tx.done]);
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
}

/**
 * Opens the store of `userId`. Tracks left by another account on the same
 * browser are discarded: a user's data is shown to that user only.
 */
export async function openTrackStore(userId: string): Promise<TrackStore> {
  const db = await openDB<TrackSchema>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore("tracks", { keyPath: "activityId" });
      database.createObjectStore("meta");
    },
  });
  const tx = db.transaction(["tracks", "meta"], "readwrite");
  const owner = await tx.objectStore("meta").get(OWNER_KEY);
  if (owner !== userId) {
    await tx.objectStore("tracks").clear();
    await tx.objectStore("meta").put(userId, OWNER_KEY);
  }
  await tx.done;
  return new IndexedDbTrackStore(db);
}

/** Deletes every track kept in this browser, e.g. on sign-out. */
export async function clearTrackStore(): Promise<void> {
  try {
    await deleteDB(DB_NAME, {
      // Another tab still holds the database open: it is deleted once closed.
      blocked: () => undefined,
    });
  } catch {
    // IndexedDB may be unavailable (private browsing): nothing was stored.
  }
}
