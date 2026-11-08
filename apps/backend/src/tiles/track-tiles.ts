import {
  diskTiles,
  type LatLng,
  metersBetween,
  rasterizeTrack,
  rasterizeTrackOutside,
  TileSet,
} from './tile-grid';

/**
 * Beyond this spacing between the points of a simplified track, small tiles
 * are noticeably missed (measured: about 2 % at 260 m, up to 14 % at 1.4 km).
 */
export const SPARSE_SPACING_M = 300;
/** Distance between the true start (or end) and the track above which it is cropped. */
export const CROP_THRESHOLD_M = 30;

/**
 * Area that may hold the cropped part of a track, around the point where
 * the visible track begins (or ends). The hidden path may wander farther
 * than the straight gap: the radius keeps a margin.
 */
export function hiddenAreaRadius(gapM: number): number {
  return 1.5 * gapM + 50;
}

/** A simplified track, e.g. the summary polyline of a Strava activity. */
export interface TrackSummary {
  points: LatLng[];
  distanceM: number;
  /** True start and end, which privacy settings may crop from `points`. */
  start: LatLng | null;
  end: LatLng | null;
}

export interface TrackAssessment {
  /** Points too far apart for the small tiles. */
  sparse: boolean;
  /** Straight distance hidden at the start, 0 when the start is visible. */
  hiddenStartM: number;
  hiddenEndM: number;
}

export function assessTrack(summary: TrackSummary): TrackAssessment {
  const { points, distanceM, start, end } = summary;
  const gap = (truth: LatLng | null, visible: LatLng | undefined) => {
    if (!truth || !visible) return 0;
    const meters = metersBetween(truth, visible);
    return meters > CROP_THRESHOLD_M ? meters : 0;
  };
  return {
    sparse: points.length < 2 || distanceM / points.length > SPARSE_SPACING_M,
    hiddenStartM: gap(start, points[0]),
    hiddenEndM: gap(end, points[points.length - 1]),
  };
}

export interface ActivityTiles {
  /** Every small tile crossed. */
  visited: TileSet;
  /** Tiles crossed outside the areas hidden by the privacy settings: the only ones others may see. */
  shared: TileSet;
  /** Areas hidden by the privacy settings, which a full track may reveal. */
  hidden: TileSet;
}

/** Tiles from a simplified track: its visible part only, plus the hidden areas. */
export function tilesFromSummary(
  summary: TrackSummary,
  assessment: TrackAssessment,
): ActivityTiles {
  const { points } = summary;
  const visited = rasterizeTrack(points);
  const hidden = new TileSet();
  const areas: [LatLng | undefined, number][] = [
    [points[0], assessment.hiddenStartM],
    [points[points.length - 1], assessment.hiddenEndM],
  ];
  for (const [center, gapM] of areas) {
    if (center && gapM > 0) {
      for (const cell of diskTiles(center, hiddenAreaRadius(gapM)).cells()) {
        hidden.addMask(cell.x, cell.y, cell.mask);
      }
    }
  }
  return { visited, shared: visited, hidden };
}

/**
 * Tiles from the full GPS track. The parts close to its true start and end,
 * as far as the privacy settings hid, are not shared.
 */
export function tilesFromStream(
  points: LatLng[],
  hiddenStartM: number,
  hiddenEndM: number,
): Pick<ActivityTiles, 'visited' | 'shared'> {
  const disks: { center: LatLng; radiusM: number }[] = [];
  if (points.length > 0 && hiddenStartM > 0) {
    disks.push({ center: points[0], radiusM: hiddenAreaRadius(hiddenStartM) });
  }
  if (points.length > 0 && hiddenEndM > 0) {
    disks.push({
      center: points[points.length - 1],
      radiusM: hiddenAreaRadius(hiddenEndM),
    });
  }
  return {
    visited: rasterizeTrack(points),
    shared: rasterizeTrackOutside(points, disks),
  };
}
