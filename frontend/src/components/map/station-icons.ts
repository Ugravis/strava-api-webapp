import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapPalette } from "./map-style";

/** Images of the stations layer, drawn once per style on a canvas: nothing to download. */
export const STATION_ICONS = {
  visited: "station-icon-visited",
  unvisited: "station-icon-unvisited",
  bubble: "station-name-bubble",
  train: "station-train",
} as const;

/** Drawn at twice their size: sharp on dense screens, scaled down elsewhere. */
const RATIO = 2;
/** Diameter of a station icon, in CSS pixels. */
const ICON_SIZE = 20;
/** Bubble: a rounded box over a tail pointing at the station. */
const BUBBLE = { width: 28, box: 18, tail: 6, radius: 7 } as const;
/** A train seen from above, pointing north: rotated along the rails. */
const TRAIN = { width: 8, length: 22 } as const;

function canvas(width: number, height: number): CanvasRenderingContext2D {
  const element = document.createElement("canvas");
  element.width = width * RATIO;
  element.height = height * RATIO;
  const context = element.getContext("2d")!;
  context.scale(RATIO, RATIO);
  return context;
}

function image(context: CanvasRenderingContext2D): ImageData {
  return context.getImageData(0, 0, context.canvas.width, context.canvas.height);
}

/** A disk in `color`, ringed and marked with the front of a train in `casing`. */
function stationIcon(color: string, casing: string): ImageData {
  const c = canvas(ICON_SIZE, ICON_SIZE);
  const middle = ICON_SIZE / 2;
  c.beginPath();
  c.arc(middle, middle, middle - 1, 0, Math.PI * 2);
  c.fillStyle = color;
  c.fill();
  c.lineWidth = 1.5;
  c.strokeStyle = casing;
  c.stroke();
  // The front of the train: body, windscreen, rails.
  c.fillStyle = casing;
  c.beginPath();
  c.roundRect(6.5, 4.5, 7, 9, 2.5);
  c.fill();
  c.fillStyle = color;
  c.fillRect(7.8, 6, 4.4, 3);
  c.beginPath();
  c.arc(8.4, 11.3, 0.8, 0, Math.PI * 2);
  c.arc(11.6, 11.3, 0.8, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = casing;
  c.lineWidth = 1.2;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(8, 14);
  c.lineTo(6.8, 16);
  c.moveTo(12, 14);
  c.lineTo(13.2, 16);
  c.stroke();
  return image(c);
}

function bubble(color: string): ImageData {
  const { width, box, tail, radius } = BUBBLE;
  const c = canvas(width, box + tail);
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(0, 0, width, box, radius);
  c.moveTo(width / 2 - 4, box - 0.5);
  c.lineTo(width / 2, box + tail);
  c.lineTo(width / 2 + 4, box - 0.5);
  c.fill();
  return image(c);
}

function train(color: string, casing: string): ImageData {
  const { width, length } = TRAIN;
  const c = canvas(width, length);
  c.fillStyle = color;
  c.strokeStyle = casing;
  c.lineWidth = 1.2;
  c.beginPath();
  c.roundRect(0.75, 0.75, width - 1.5, length - 1.5, [3.5, 3.5, 1.5, 1.5]);
  c.fill();
  c.stroke();
  // The windscreen at the front, the joints between the cars.
  c.fillStyle = casing;
  c.fillRect(2, 2.5, width - 4, 2);
  c.fillRect(1, 9, width - 2, 0.8);
  c.fillRect(1, 15, width - 2, 0.8);
  return image(c);
}

/** Adds the images of the stations layer to the style, replacing those of another palette. */
export function addStationIcons(map: MapLibreMap, palette: MapPalette): void {
  const { width, box, radius } = BUBBLE;
  const images: [string, ImageData, Parameters<MapLibreMap["addImage"]>[2]][] = [
    [STATION_ICONS.visited, stationIcon(palette.station, palette.stationCasing), {}],
    [STATION_ICONS.unvisited, stationIcon(palette.stationUnvisited, palette.stationCasing), {}],
    [
      STATION_ICONS.bubble,
      bubble(palette.station),
      {
        // Stretched around the tail, which keeps its shape; the name fits the box.
        stretchX: [
          [radius * RATIO, (width / 2 - 5) * RATIO],
          [(width / 2 + 5) * RATIO, (width - radius) * RATIO],
        ],
        stretchY: [[radius * RATIO, (box - radius) * RATIO]],
        content: [radius * RATIO, 3 * RATIO, (width - radius) * RATIO, (box - 3) * RATIO],
      },
    ],
    // In the color of the casing, outlined in violet: it stands out on the violet railway.
    [STATION_ICONS.train, train(palette.stationCasing, palette.station), {}],
  ];
  for (const [id, data, options] of images) {
    if (map.hasImage(id)) map.removeImage(id);
    map.addImage(id, data, { pixelRatio: RATIO, ...options });
  }
}
