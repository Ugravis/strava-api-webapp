import type { StravaActivity } from './api/strava-api.types';
import {
  toActivityData,
  toSportType,
  toTimezone,
} from './strava-activity.mapper';

const activity = {
  id: 123,
  name: 'Sortie du matin',
  sport_type: 'GravelRide',
  start_date: '2026-10-12T07:30:00Z',
  timezone: '(GMT+01:00) Europe/Paris',
  distance: 42195.5,
  moving_time: 5400,
  elapsed_time: 6000,
  total_elevation_gain: 512,
  trainer: false,
  manual: false,
  // Present in real payloads, and never stored.
  map: { summary_polyline: 'abc' },
  start_latlng: [48.85, 2.35],
} as StravaActivity;

describe('Strava activity mapper', () => {
  it('maps a Strava activity onto the canonical schema', () => {
    expect(toActivityData(activity)).toEqual({
      sportType: 'gravel_ride',
      name: 'Sortie du matin',
      startedAt: new Date('2026-10-12T07:30:00Z'),
      timezone: 'Europe/Paris',
      distanceM: 42195.5,
      movingTimeS: 5400,
      elapsedTimeS: 6000,
      elevationGainM: 512,
      indoor: false,
      manual: false,
    });
  });

  it('drops every location field', () => {
    const data = toActivityData(activity);
    expect(data).not.toHaveProperty('map');
    expect(data).not.toHaveProperty('start_latlng');
    expect(JSON.stringify(data)).not.toContain('48.85');
  });

  it('maps unknown sport types to other', () => {
    expect(toSportType('Run')).toBe('run');
    expect(toSportType('Pickleball')).toBe('other');
  });

  it('extracts the IANA time zone', () => {
    expect(toTimezone('(GMT-08:00) America/Los_Angeles')).toBe(
      'America/Los_Angeles',
    );
    expect(toTimezone(null)).toBeNull();
    expect(toTimezone('garbage value')).toBeNull();
  });
});
