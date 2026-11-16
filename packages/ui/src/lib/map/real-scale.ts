import type { ExpressionSpecification } from "maplibre-gl";

const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
/** Ground covered by one CSS pixel of the images of the trains at their real size, in metres. */
const METRES_PER_IMAGE_PX = 1.25;
/** Size of the trains zoomed out: they never shrink below it. */
export const MIN_TRAIN_SIZE = 1.1;
/** Latitude of the real scale, mid France: a style expression cannot read the latitude. */
const REFERENCE_LATITUDE = 46.5;
const MAX_SCALE_ZOOM = 24;

/** Ground covered by one CSS pixel at `zoom` and `latitude`, in metres. */
export function metresPerPixelAt(zoom: number, latitude: number): number {
  return (
    (EARTH_CIRCUMFERENCE_M * Math.cos((latitude * Math.PI) / 180)) /
    (512 * 2 ** zoom)
  );
}

/**
 * Zoom from which the trains and the rails are drawn at their real size,
 * growing with the buildings; zoomed out, they keep their size.
 */
export const REAL_SCALE_ZOOM = Math.log2(
  (EARTH_CIRCUMFERENCE_M *
    Math.cos((REFERENCE_LATITUDE * Math.PI) / 180) *
    MIN_TRAIN_SIZE) /
    (512 * METRES_PER_IMAGE_PX),
);

type Stop = [zoom: number, value: number];

/** The stops of `realScale(stops)`: those below the real scale, then doubling with each zoom level. */
function realScaleStops(stops: Stop[]): Stop[] {
  const below = stops.filter(([zoom]) => zoom < REAL_SCALE_ZOOM);
  const [z0, v0] = below[below.length - 1];
  const next = stops.find(([zoom]) => zoom >= REAL_SCALE_ZOOM);
  const atScale = next
    ? v0 + ((next[1] - v0) * (REAL_SCALE_ZOOM - z0)) / (next[0] - z0)
    : v0;
  return [
    ...below,
    [REAL_SCALE_ZOOM, atScale],
    [MAX_SCALE_ZOOM, atScale * 2 ** (MAX_SCALE_ZOOM - REAL_SCALE_ZOOM)],
  ];
}

/**
 * A size by zoom from `stops` (increasing zooms), up to the real scale, then
 * doubling with each zoom level as the ground does.
 */
export function realScale(stops: Stop[]): ExpressionSpecification {
  return [
    "interpolate",
    ["exponential", 2],
    ["zoom"],
    ...realScaleStops(stops).flat(),
  ] as ExpressionSpecification;
}

/** Size of the images of the trains. */
export const TRAIN_SIZE = realScale([[0, MIN_TRAIN_SIZE]]);
