import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapPalette } from "./map-style";

/** Images of the stations layer, drawn once per style on a canvas: nothing to download. */
export const STATION_ICONS = {
  /** The front of a train, beside the name in the bubble. */
  glyph: "station-glyph",
  bubble: "station-name-bubble",
  bubbleUnvisited: "station-name-bubble-unvisited",
} as const;

/**
 * Vehicles of a train, seen from above pointing north, `length` long in CSS
 * pixels; each has a selected variant. Each kind of train has its own driving
 * vehicle: the pointed nose of a TGV, the rounded front of a TER, the boxy
 * locomotive of an Intercités, the hooded one of a freight train, the short
 * railcar of a local shuttle.
 */
export const TRAIN_PARTS = {
  tgvCab: { image: "train-cab-tgv", length: 22 },
  terCab: { image: "train-cab-ter", length: 18 },
  intercitesCab: { image: "train-cab-intercites", length: 18 },
  freightCab: { image: "train-cab-freight", length: 17 },
  localCab: { image: "train-cab-local", length: 15 },
  car: { image: "train-car", length: 16 },
  wagon: { image: "train-wagon", length: 14 },
} as const;
export type TrainPart = keyof typeof TRAIN_PARTS;
export type TrainCab = Extract<TrainPart, `${string}Cab`>;
/**
 * A whole train zoomed out, without its vehicles, by its driving vehicle:
 * `length` long in CSS pixels, with a selected variant. Its front and length
 * tell its kind: the long pointed TGV, the square Intercités, the rounded TER,
 * the ribbed freight train, the short local railcar.
 */
export const TRAIN_BLOCKS = {
  tgvCab: { image: "train-block-tgv", length: 20 },
  intercitesCab: { image: "train-block-intercites", length: 16 },
  terCab: { image: "train-block-ter", length: 14 },
  freightCab: { image: "train-block-freight", length: 18 },
  localCab: { image: "train-block-local", length: 10 },
} as const satisfies Record<TrainCab, { image: string; length: number }>;
/** Suffix of the image of a vehicle of the train shown in the panel. */
export const SELECTED_SUFFIX = "-selected";

/** Drawn at twice their size: sharp on dense screens, scaled down elsewhere. */
const RATIO = 2;
/** Side of the glyph of a station, in CSS pixels. */
const GLYPH_SIZE = 11;
/** Bubble: a rounded box over a tail pointing at the station. */
const BUBBLE = { width: 28, box: 18, tail: 6, radius: 7 } as const;
/** Width of the vehicles of a train, in CSS pixels. */
export const TRAIN_WIDTH = 8;
/** The vehicles are drawn much larger: they grow with the ground zoomed in and stay sharp. */
const TRAIN_RATIO = 12;

function canvas(
  width: number,
  height: number,
  ratio = RATIO,
): CanvasRenderingContext2D {
  const element = document.createElement("canvas");
  element.width = width * ratio;
  element.height = height * ratio;
  const context = element.getContext("2d")!;
  context.scale(ratio, ratio);
  return context;
}

function image(context: CanvasRenderingContext2D): ImageData {
  return context.getImageData(
    0,
    0,
    context.canvas.width,
    context.canvas.height,
  );
}

/** The front of a train in `color`: body, windscreen, lights and rails. */
function glyph(color: string): ImageData {
  const c = canvas(GLYPH_SIZE, GLYPH_SIZE);
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(2, 0.5, 7, 8, 2.5);
  c.fill();
  c.clearRect(3.3, 2, 4.4, 2.6);
  c.clearRect(3.4, 6, 1.2, 1.2);
  c.clearRect(6.4, 6, 1.2, 1.2);
  c.strokeStyle = color;
  c.lineWidth = 1.1;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(3.6, 9);
  c.lineTo(2.6, 10.5);
  c.moveTo(7.4, 9);
  c.lineTo(8.4, 10.5);
  c.stroke();
  return image(c);
}

function bubble(color: string): ImageData {
  const { width, box, tail, radius } = BUBBLE;
  const c = canvas(width, box + tail);
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(0, 0, width, box, radius);
  c.fill();
  // Filled on its own and overlapping the box: one path would leave a seam where the two meet.
  c.beginPath();
  c.moveTo(width / 2 - 4, box - 2);
  c.lineTo(width / 2, box + tail);
  c.lineTo(width / 2 + 4, box - 2);
  c.closePath();
  c.fill();
  return image(c);
}

/**
 * A whole train in `color`, outlined in `casing`: a box with the front of its
 * driving vehicle, a stripe along a TGV, ribs across a freight train.
 */
function block(cab: TrainCab, color: string, casing: string): ImageData {
  const length = TRAIN_BLOCKS[cab].length;
  const c = canvas(TRAIN_WIDTH, length);
  const bottom = length - 0.75;
  c.fillStyle = color;
  c.strokeStyle = casing;
  c.lineWidth = 1.2;
  c.lineJoin = "round";
  c.beginPath();
  cabFront(c, cab);
  c.arcTo(TRAIN_WIDTH - 0.75, bottom, 0.75, bottom, 2);
  c.arcTo(0.75, bottom, 0.75, 0.75, 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = casing;
  if (cab === "tgvCab") c.fillRect(3.2, 8, TRAIN_WIDTH - 6.4, length - 11);
  if (cab === "freightCab")
    for (let y = 4; y < length - 2; y += 2.5)
      c.fillRect(1.4, y, TRAIN_WIDTH - 2.8, 0.8);
  return image(c);
}

/** The outline of the front of a driving vehicle, from its left side to its right one: pointed, rounded or flat. */
function cabFront(c: CanvasRenderingContext2D, part: TrainPart): void {
  const right = TRAIN_WIDTH - 0.75;
  if (part === "tgvCab") {
    c.moveTo(0.75, 9);
    c.bezierCurveTo(0.75, 3, 2.5, 0.75, TRAIN_WIDTH / 2, 0.75);
    c.bezierCurveTo(TRAIN_WIDTH - 2.5, 0.75, right, 3, right, 9);
    return;
  }
  const radius = part === "terCab" || part === "localCab" ? 3.5 : 1.2;
  c.moveTo(0.75, 0.75 + radius);
  c.arcTo(0.75, 0.75, 0.75 + radius, 0.75, radius);
  c.arcTo(right, 0.75, right, 0.75 + radius, radius);
}

/**
 * A vehicle of a train in `color`, outlined in `casing`: a driving vehicle
 * with its cab at the front, a coach with its roof, a freight wagon with its
 * ribs.
 */
function vehicle(part: TrainPart, color: string, casing: string): ImageData {
  const length = TRAIN_PARTS[part].length;
  const c = canvas(TRAIN_WIDTH, length, TRAIN_RATIO);
  const inner = TRAIN_WIDTH - 1.5;
  const bottom = length - 0.75;
  c.fillStyle = color;
  c.strokeStyle = casing;
  c.lineWidth = 1.2;
  c.lineJoin = "round";
  c.beginPath();
  if (part.endsWith("Cab")) {
    cabFront(c, part);
    c.arcTo(TRAIN_WIDTH - 0.75, bottom, 0.75, bottom, 1.2);
    c.arcTo(0.75, bottom, 0.75, 0.75, 1.2);
    c.closePath();
  } else {
    c.roundRect(0.75, 0.75, inner, length - 1.5, part === "car" ? 1.5 : 0.8);
  }
  c.fill();
  c.stroke();
  c.fillStyle = casing;
  switch (part) {
    case "tgvCab":
      // A narrow windscreen far back on the nose, the pantograph on the roof.
      c.fillRect(2.2, 7, TRAIN_WIDTH - 4.4, 1.8);
      c.fillRect(3.2, 13, TRAIN_WIDTH - 6.4, 6);
      break;
    case "terCab":
      c.fillRect(1.8, 2.4, TRAIN_WIDTH - 3.6, 2.2);
      for (let y = 8; y < length - 2; y += 3)
        c.fillRect(3.2, y, TRAIN_WIDTH - 6.4, 1.2);
      break;
    case "intercitesCab":
      // A cab at each end of the box, the two pantographs between.
      c.fillRect(2, 2.2, TRAIN_WIDTH - 4, 1.6);
      c.fillRect(2.6, 5.5, TRAIN_WIDTH - 5.2, 3);
      c.fillRect(2.6, 10, TRAIN_WIDTH - 5.2, 3);
      c.fillRect(2, length - 3.8, TRAIN_WIDTH - 4, 1.6);
      break;
    case "freightCab":
      // A short cab, then the long hood and its louvres.
      c.fillRect(2, 2.2, TRAIN_WIDTH - 4, 1.6);
      for (let y = 6.5; y < length - 2; y += 1.8)
        c.fillRect(2.4, y, TRAIN_WIDTH - 4.8, 0.7);
      break;
    case "localCab":
      // The wide windscreen of a railcar, its exhaust on the roof.
      c.fillRect(1.6, 2.4, TRAIN_WIDTH - 3.2, 2.6);
      c.beginPath();
      c.arc(TRAIN_WIDTH / 2, 9.5, 1.3, 0, 2 * Math.PI);
      c.fill();
      break;
    case "car":
      // A line of roof vents.
      for (let y = 3.5; y < length - 3; y += 3)
        c.fillRect(3.2, y, TRAIN_WIDTH - 6.4, 1.2);
      break;
    case "wagon":
      for (let y = 3; y < length - 2; y += 2.5)
        c.fillRect(1.4, y, TRAIN_WIDTH - 2.8, 0.7);
      break;
  }
  return image(c);
}

type ImageEntry = [
  id: string,
  data: ImageData,
  options: Parameters<MapLibreMap["addImage"]>[2],
];

const VEHICLE_OPTIONS: ImageEntry[2] = { pixelRatio: TRAIN_RATIO };

/** Adds the images of the stations layer to the style, replacing those of another palette. */
export function addStationIcons(map: MapLibreMap, palette: MapPalette): void {
  const { width, box, radius } = BUBBLE;
  // Stretched around the tail, which keeps its shape; the name fits the box.
  const bubbleOptions: ImageEntry[2] = {
    stretchX: [
      [radius * RATIO, (width / 2 - 5) * RATIO],
      [(width / 2 + 5) * RATIO, (width - radius) * RATIO],
    ],
    stretchY: [[radius * RATIO, (box - radius) * RATIO]],
    content: [
      radius * RATIO,
      3 * RATIO,
      (width - radius) * RATIO,
      (box - 3) * RATIO,
    ],
  };
  const images: ImageEntry[] = [
    [STATION_ICONS.glyph, glyph(palette.stationCasing), {}],
    [STATION_ICONS.bubble, bubble(palette.station), bubbleOptions],
    [
      STATION_ICONS.bubbleUnvisited,
      bubble(palette.stationUnvisited),
      bubbleOptions,
    ],
    ...(Object.keys(TRAIN_BLOCKS) as TrainCab[]).flatMap(
      (cab): ImageEntry[] => [
        [
          TRAIN_BLOCKS[cab].image,
          block(cab, palette.stationCasing, palette.station),
          {},
        ],
        [
          TRAIN_BLOCKS[cab].image + SELECTED_SUFFIX,
          block(cab, palette.station, palette.stationCasing),
          {},
        ],
      ],
    ),
    // In the color of the casing, outlined in violet: they stand out on the violet railway. Selected, the other way round.
    ...(Object.keys(TRAIN_PARTS) as TrainPart[]).flatMap(
      (part): ImageEntry[] => [
        [
          TRAIN_PARTS[part].image,
          vehicle(part, palette.stationCasing, palette.station),
          VEHICLE_OPTIONS,
        ],
        [
          TRAIN_PARTS[part].image + SELECTED_SUFFIX,
          vehicle(part, palette.station, palette.stationCasing),
          VEHICLE_OPTIONS,
        ],
      ],
    ),
  ];
  for (const [id, data, options] of images) {
    if (map.hasImage(id)) map.removeImage(id);
    map.addImage(id, data, { pixelRatio: RATIO, ...options });
  }
}
