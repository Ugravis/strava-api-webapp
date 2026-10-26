import type { ActivityTotals } from '../activities/activities.service';
import type { BadgeMetric } from './badge-metrics';
import type { MetricEvent } from './distance-progress';

/** Metrics added up from the totals of each activity. */
export type ActivityMetric = Extract<
  BadgeMetric,
  'distance' | 'time' | 'elevation' | 'activities' | 'active_days'
>;

/** Whether the metric comes from activities alone. */
export function isActivityMetric(
  metric: BadgeMetric,
): metric is ActivityMetric {
  return (
    metric === 'distance' ||
    metric === 'time' ||
    metric === 'elevation' ||
    metric === 'activities' ||
    metric === 'active_days'
  );
}

/**
 * What each activity, sorted by start, brings to a metric. A day counts
 * once, on the first activity of its UTC date, the others bringing nothing.
 */
export function activityEvents(
  metric: ActivityMetric,
  activities: readonly ActivityTotals[],
): MetricEvent[] {
  const days = new Set<string>();
  return activities.map((activity) => {
    const { id, name, sportType, startedAt } = activity;
    return { id, name, sportType, startedAt, value: amount(activity) };
  });

  function amount(activity: ActivityTotals): number {
    switch (metric) {
      case 'distance':
        return activity.distanceM;
      case 'time':
        return activity.movingTimeS;
      case 'elevation':
        return activity.elevationGainM ?? 0;
      case 'activities':
        return 1;
      case 'active_days': {
        const day = activity.startedAt.toISOString().slice(0, 10);
        if (days.has(day)) return 0;
        days.add(day);
        return 1;
      }
    }
  }
}
