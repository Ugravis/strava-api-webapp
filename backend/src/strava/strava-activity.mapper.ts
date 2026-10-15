import type { ActivityData } from '../activities/activities.service';
import type { SportType } from '../activities/sport-type';
import type { StravaActivity } from './api/strava-api.types';

const NAME_MAX_LENGTH = 255;

const SPORT_TYPES: Record<string, SportType> = {
  Run: 'run',
  TrailRun: 'trail_run',
  VirtualRun: 'virtual_run',
  Walk: 'walk',
  Hike: 'hike',
  Ride: 'ride',
  GravelRide: 'gravel_ride',
  MountainBikeRide: 'mountain_bike_ride',
  EBikeRide: 'e_bike_ride',
  EMountainBikeRide: 'e_mountain_bike_ride',
  VirtualRide: 'virtual_ride',
  Velomobile: 'ride',
  Swim: 'swim',
  AlpineSki: 'alpine_ski',
  BackcountrySki: 'backcountry_ski',
  NordicSki: 'nordic_ski',
  RollerSki: 'nordic_ski',
  Snowboard: 'snowboard',
  Snowshoe: 'snowshoe',
  Rowing: 'rowing',
  VirtualRow: 'rowing',
  Kayaking: 'kayaking',
  Canoeing: 'canoeing',
  StandUpPaddling: 'stand_up_paddling',
  InlineSkate: 'inline_skate',
  Wheelchair: 'wheelchair',
  Handcycle: 'handcycle',
  Workout: 'workout',
  WeightTraining: 'workout',
  Crossfit: 'workout',
  HighIntensityIntervalTraining: 'workout',
};

export function toSportType(stravaSportType: string): SportType {
  return SPORT_TYPES[stravaSportType] ?? 'other';
}

/** `(GMT+01:00) Europe/Paris` → `Europe/Paris`. */
export function toTimezone(
  stravaTimezone: string | null | undefined,
): string | null {
  const zone = stravaTimezone?.split(') ').pop()?.trim();
  return zone && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(zone) ? zone : null;
}

/** Maps a Strava activity onto the canonical schema; location data is dropped. */
export function toActivityData(activity: StravaActivity): ActivityData {
  return {
    sportType: toSportType(activity.sport_type),
    name: activity.name.slice(0, NAME_MAX_LENGTH),
    startedAt: new Date(activity.start_date),
    timezone: toTimezone(activity.timezone),
    distanceM: activity.distance,
    movingTimeS: activity.moving_time,
    elapsedTimeS: activity.elapsed_time,
    elevationGainM: activity.total_elevation_gain ?? null,
    indoor: activity.trainer ?? false,
    manual: activity.manual ?? false,
  };
}
