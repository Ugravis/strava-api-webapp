import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapPalette } from "./map-style";

/** Images of the stations layer, drawn once per style on a canvas: nothing to download. */
export const STATION_ICONS = {
  /** The front of a train, beside the name in the bubble. */
  glyph: "station-glyph",
  bubble: "station-name-bubble",
  bubbleUnvisited: "station-name-bubble-unvisited",
} as const;

/** Vehicles of a train, seen from above pointing north, `length` long in CSS pixels; each has a selected variant. */
export const TRAIN_PARTS = {
  loco: { image: "train-loco", length: 18 },
  car: { image: "train-car", length: 16 },
  wagon: { image: "train-wagon", length: 14 },
} as const;
/** A whole train zoomed out, without its vehicles: `length` long in CSS pixels, with a selected variant. */
export const TRAIN_BLOCK = { image: "train-block", length: 14 } as const;
export type TrainPart = keyof typeof TRAIN_PARTS;
/** Suffix of the image of a vehicle of the train shown in the panel. */
export const SELECTED_SUFFIX = "-selected";

/** Drawn at twice their size: sharp on dense screens, scaled down elsewhere. */
const RATIO = 2;
/** Side of the glyph of a station, in CSS pixels. */
const GLYPH_SIZE = 11;
/** Bubble: a rounded box over a tail pointing at the station. */
const BUBBLE = { width: 28, box: 18, tail: 6, radius: 7 } as const;
/** Width of the vehicles of a train, in CSS pixels. */
const TRAIN_WIDTH = 8;

function canvas(width: number, height: number): CanvasRenderingContext2D {
  const element = document.createElement("canvas");
  element.width = width * RATIO;
  element.height = height * RATIO;
  const context = element.getContext("2d")!;
  context.scale(RATIO, RATIO);
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

/** A whole train in `color`, outlined in `casing`: a plain rounded box. */
function block(color: string, casing: string): ImageData {
  const c = canvas(TRAIN_WIDTH, TRAIN_BLOCK.length);
  c.fillStyle = color;
  c.strokeStyle = casing;
  c.lineWidth = 1.2;
  c.beginPath();
  c.roundRect(0.75, 0.75, TRAIN_WIDTH - 1.5, TRAIN_BLOCK.length - 1.5, 2.5);
  c.fill();
  c.stroke();
  return image(c);
}

/** A vehicle of a train in `color`, outlined in `casing`: a locomotive with its cab at the front, a coach with its roof, a freight wagon with its ribs. */
function vehicle(part: TrainPart, color: string, casing: string): ImageData {
  const length = TRAIN_PARTS[part].length;
  const c = canvas(TRAIN_WIDTH, length);
  const inner = TRAIN_WIDTH - 1.5;
  c.fillStyle = color;
  c.strokeStyle = casing;
  c.lineWidth = 1.2;
  c.beginPath();
  c.roundRect(
    0.75,
    0.75,
    inner,
    length - 1.5,
    part === "loco" ? [3.5, 3.5, 1.2, 1.2] : part === "car" ? 1.5 : 0.8,
  );
  c.fill();
  c.stroke();
  c.fillStyle = casing;
  if (part === "loco") {
    // The windscreen at the front, the roof equipment behind it.
    c.fillRect(2, 2.6, TRAIN_WIDTH - 4, 2);
    c.fillRect(3, 8, TRAIN_WIDTH - 6, 6);
  } else if (part === "car") {
    // A line of roof vents.
    for (let y = 3.5; y < length - 3; y += 3)
      c.fillRect(3.2, y, TRAIN_WIDTH - 6.4, 1.2);
  } else {
    for (let y = 3; y < length - 2; y += 2.5)
      c.fillRect(1.4, y, TRAIN_WIDTH - 2.8, 0.7);
  }
  return image(c);
}

type ImageEntry = [
  id: string,
  data: ImageData,
  options: Parameters<MapLibreMap["addImage"]>[2],
];

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
    [TRAIN_BLOCK.image, block(palette.stationCasing, palette.station), {}],
    [
      TRAIN_BLOCK.image + SELECTED_SUFFIX,
      block(palette.station, palette.stationCasing),
      {},
    ],
    // In the color of the casing, outlined in violet: they stand out on the violet railway. Selected, the other way round.
    ...(Object.keys(TRAIN_PARTS) as TrainPart[]).flatMap(
      (part): ImageEntry[] => [
        [
          TRAIN_PARTS[part].image,
          vehicle(part, palette.stationCasing, palette.station),
          {},
        ],
        [
          TRAIN_PARTS[part].image + SELECTED_SUFFIX,
          vehicle(part, palette.station, palette.stationCasing),
          {},
        ],
      ],
    ),
  ];
  for (const [id, data, options] of images) {
    if (map.hasImage(id)) map.removeImage(id);
    map.addImage(id, data, { pixelRatio: RATIO, ...options });
  }
}
