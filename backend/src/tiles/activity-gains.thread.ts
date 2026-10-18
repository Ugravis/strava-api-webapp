import { parentPort } from 'node:worker_threads';
import { type ActivityCells, activityGains } from './activity-gains';
import type { PackedActivityCells } from './activity-gains.service';

/**
 * Worker thread replaying the tiles of a user activity by activity: the
 * hundreds of thousands of small tiles of an athlete with years of history
 * must not block the event loop of the API.
 */
parentPort?.once(
  'message',
  ({ activityCount, activities, xs, ys, masks }: PackedActivityCells) => {
    const cells: ActivityCells[] = Array.from(
      { length: activityCount },
      () => ({ xs: [], ys: [], masks: [] }),
    );
    for (let i = 0; i < xs.length; i++) {
      const activity = cells[activities[i]];
      activity.xs.push(xs[i]);
      activity.ys.push(ys[i]);
      activity.masks.push(BigInt.asUintN(64, masks[i]));
    }
    parentPort?.postMessage(activityGains(cells));
  },
);
