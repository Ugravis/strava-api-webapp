import type { ActivityTracksPage, MappableActivity } from "@/lib/api/types";
import type { TrackStore } from "./track-store";

export interface TrackSource {
  getMappableActivities(): Promise<MappableActivity[]>;
  getTracksPage(params: { after?: Date; page: number }): Promise<ActivityTracksPage>;
}

export interface TrackSyncProgress {
  fetched: number;
  total: number;
}

/**
 * Aligns the local store with the activities of the account: tracks of
 * deleted activities are pruned, and only the missing ones are requested.
 * Returns whether the store changed.
 */
export async function syncTracks(
  store: TrackStore,
  source: TrackSource,
  onProgress?: (progress: TrackSyncProgress) => void,
): Promise<boolean> {
  const [activities, storedIds] = await Promise.all([source.getMappableActivities(), store.ids()]);

  const expected = new Set(activities.map((activity) => activity.id));
  const stale = storedIds.filter((id) => !expected.has(id));
  if (stale.length > 0) {
    await store.deleteMany(stale);
  }

  const stored = new Set(storedIds);
  const missing = activities.filter((activity) => !stored.has(activity.id));
  if (missing.length === 0) {
    return stale.length > 0;
  }

  // Strava filters on the start date: starting one second before the oldest
  // missing activity skips the pages that only hold known tracks.
  const oldest = missing.reduce((min, activity) => Math.min(min, Date.parse(activity.startedAt)), Infinity);
  const after = new Date(oldest - 1000);
  const pending = new Set(missing.map((activity) => activity.id));
  const total = pending.size;
  onProgress?.({ fetched: 0, total });

  for (let page = 1; pending.size > 0; page++) {
    const { tracks, hasMore } = await source.getTracksPage({ after, page });
    const wanted = tracks.filter((track) => pending.has(track.activityId));
    await store.putMany(wanted);
    for (const track of wanted) pending.delete(track.activityId);
    onProgress?.({ fetched: total - pending.size, total });
    if (!hasMore) break;
  }

  // Activities Strava no longer lists (deleted, awaiting reconciliation) are
  // kept without track, so that they are not requested on every visit.
  if (pending.size > 0) {
    await store.putMany([...pending].map((activityId) => ({ activityId, polyline: null })));
  }
  return true;
}
