import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import { openTrackStore, type TrackStore } from "./track-store";
import { syncTracks, type TrackSource, type TrackSyncProgress } from "./track-sync";

export type TrackSyncStatus = "idle" | "syncing" | "ready" | "error";

export interface TrackSyncSnapshot {
  status: TrackSyncStatus;
  /** Set while missing tracks are fetched. */
  progress: TrackSyncProgress | null;
  errorCode: ApiErrorCode | null;
  /** Incremented whenever the stored tracks change. */
  version: number;
}

/**
 * Keeps the local tracks of a user aligned with the account, independently
 * of the page displayed. Concurrent requests are merged: a request received
 * during a run triggers one more run once it ends.
 */
export class TrackSyncManager {
  private snapshot: TrackSyncSnapshot = { status: "idle", progress: null, errorCode: null, version: 0 };
  private readonly listeners = new Set<() => void>();
  private store: Promise<TrackStore> | null = null;
  private running: Promise<void> | null = null;
  private rerun = false;

  constructor(
    private readonly userId: string,
    private readonly source: TrackSource,
  ) {}

  /** Opened on first use: the manager is created during rendering. */
  getStore(): Promise<TrackStore> {
    this.store ??= openTrackStore(this.userId);
    return this.store;
  }

  getSnapshot = (): TrackSyncSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  sync(): Promise<void> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = this.run().finally(() => {
      this.running = null;
      if (this.rerun) {
        this.rerun = false;
        void this.sync();
      }
    });
    return this.running;
  }

  /** Forgets every track, e.g. once the Strava access is revoked. */
  async reset(): Promise<void> {
    await (await this.getStore()).clear();
    this.update({ status: "idle", progress: null, errorCode: null, version: this.snapshot.version + 1 });
  }

  private async run(): Promise<void> {
    this.update({ status: "syncing", errorCode: null });
    try {
      const store = await this.getStore();
      const changed = await syncTracks(store, this.source, (progress) => this.update({ progress }));
      this.update({
        status: "ready",
        progress: null,
        version: changed ? this.snapshot.version + 1 : this.snapshot.version,
      });
    } catch (failure) {
      // Tracks fetched before the failure are stored: they are shown anyway.
      this.update({
        status: "error",
        progress: null,
        errorCode: errorCodeOf(failure),
        version: this.snapshot.version + 1,
      });
    }
  }

  private update(changes: Partial<TrackSyncSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...changes };
    for (const listener of this.listeners) listener();
  }
}
