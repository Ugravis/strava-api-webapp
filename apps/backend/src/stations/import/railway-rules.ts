import type { Tags } from './osm-opl';

/** Why a `railway=station|halt` node is not kept as a train station. */
export type StationExclusion =
  /** Metro, tram, light rail, monorail, funicular or miniature railway. */
  | 'not_train'
  /** Closed: tagged disused, abandoned or not served by trains. */
  | 'closed'
  /** No passenger train route serves it: a park train, a closed station still mapped… */
  | 'not_served'
  /** The same station as a kept one next to it, mapped twice: merged into it. */
  | 'merged';

const NOT_TRAIN_STATIONS = new Set([
  'subway',
  'light_rail',
  'monorail',
  'funicular',
  'tram',
  'miniature',
]);

/** Railways walked between stations, heritage lines included. */
const TRACK_RAILWAYS = new Set(['rail', 'narrow_gauge', 'preserved']);
/** Tracks of the yards and depots, never between two stations. */
const SERVICE_TRACKS = new Set(['yard', 'siding', 'spur']);
/** Lines no passenger train runs on. */
const NON_PASSENGER_USAGES = new Set(['industrial', 'military', 'test']);

/** Whether a node is a candidate station: `railway=station|halt`. */
export function isStationNode(tags: Tags | null): boolean {
  return tags?.railway === 'station' || tags?.railway === 'halt';
}

/**
 * Why a candidate station is excluded, or null when it may be kept once a
 * passenger train route serves it. A `not_train` station is kept only when
 * a train route serves it directly.
 */
export function stationExclusion(tags: Tags): StationExclusion | null {
  if (
    NOT_TRAIN_STATIONS.has(tags.station ?? '') ||
    tags.subway === 'yes' ||
    tags.light_rail === 'yes' ||
    tags.tram === 'yes' ||
    tags.monorail === 'yes' ||
    tags.funicular === 'yes'
  ) {
    // `train=yes` is not enough: metros such as the VAL of Lille carry it.
    // A station shared with the trains is kept by its train routes.
    return 'not_train';
  }
  if (
    tags.train === 'no' ||
    tags.disused === 'yes' ||
    tags.abandoned === 'yes' ||
    tags['railway:historic'] !== undefined ||
    tags['passenger'] === 'no'
  ) {
    return 'closed';
  }
  return null;
}

/** Passenger train routes, heritage and tourist trains included. */
export function isTrainRoute(tags: Tags | null): boolean {
  return tags?.type === 'route' && tags.route === 'train';
}

export function isStopArea(tags: Tags | null): boolean {
  return (
    tags?.type === 'public_transport' && tags.public_transport === 'stop_area'
  );
}

/** Roles of the stops and platforms in a route: where its trains stop. */
export function isStopRole(role: string): boolean {
  return role.startsWith('stop') || role.startsWith('platform');
}

/** Whether a way is a track at all: main, branch and heritage lines. */
export function isTrackWay(tags: Tags | null): boolean {
  return tags !== null && TRACK_RAILWAYS.has(tags.railway ?? '');
}

/**
 * Whether passenger trains can run on a track, so that the walks between
 * stations follow it. A track of a passenger train route always can; other
 * tracks unless they are yard, siding or spur tracks, industrial, military
 * or test lines, or freight only.
 */
export function isPassengerTrack(tags: Tags, inTrainRoute: boolean): boolean {
  if (inTrainRoute) {
    return true;
  }
  return !(
    SERVICE_TRACKS.has(tags.service ?? '') ||
    NON_PASSENGER_USAGES.has(tags.usage ?? '') ||
    tags['railway:traffic_mode'] === 'freight' ||
    tags.passenger === 'no'
  );
}

/**
 * Whether a station beside a track is served by it although no train route
 * says so: where the routes are not mapped, a passenger track that is
 * neither a heritage nor a tourist line.
 */
export function servesStationsNearby(tags: Tags): boolean {
  return (
    isPassengerTrack(tags, false) &&
    tags.railway !== 'preserved' &&
    tags.usage !== 'tourism'
  );
}
