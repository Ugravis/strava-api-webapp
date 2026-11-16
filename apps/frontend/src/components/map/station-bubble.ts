import { Marker, type Map as MapLibreMap, type PointLike } from "maplibre-gl";

/**
 * The bubble of the station shown, as drawn on the map by the names layers: a
 * rounded box over a tail, the text fitted with its padding plus the rounded
 * ends of the image. Measured on the map, like the glyph drawn `glyphShift`
 * pixels right of and below its advance.
 */
const BOX = { height: 23, radius: 8, paddingLeft: 14, paddingRight: 13, glyphShift: [2, 1] } as const;
/** Width of the glyph before the name, in pixels: its advance on the map too. */
const GLYPH_SIZE = 11;
/** The font of the names on the map, as the map knows it, and the size of its glyphs. */
const MAP_FONT = "Noto Sans Bold";
const GLYPH_EM = 24;
const TAIL = { height: 5, halfWidth: 4 } as const;
/** Font of the names on the map, in pixels. */
const FONT_SIZE = 11.5;
/** Width of the white outline outside the box, in pixels. */
const OUTLINE = 2;
/** Room around the bubble for its outline, in pixels. */
const MARGIN = OUTLINE + 2;
/** Zooms of the lift of the name, from the first to the second: the names of the other stations appear from the first. */
const LIFT_ZOOMS = [11, 14] as const;
const SVG = "http://www.w3.org/2000/svg";
/** Longest time the bubble of a station no longer shown stays, in milliseconds: its name fades in on the map in 300. */
const LEAVE_MAX_MS = 500;

/** What the bubble shows: a name over its point, in the colors of the station, lifted like its name on the map. */
export interface BubbleStation {
  lon: number;
  lat: number;
  name: string;
  fill: string;
  text: string;
  /** Address of the glyph before the name, in `text`. */
  glyph: string;
  /** Opacity of the bubble, like that of the names. */
  opacity: number;
  /** Lift of the name, in ems, at the zoom it appears and from zoom 14. */
  lift: readonly [number, number];
}

/**
 * The name of the station shown in a DOM bubble over the map, its tail on the
 * dot. Its white outline is drawn where it sticks out of the outline of the
 * station (`outline()`, in coordinates): it closes the white outline of the
 * footprint or the zone around both.
 */
export class StationBubble {
  private readonly marker: Marker;
  private readonly root: HTMLDivElement;
  private readonly label: HTMLSpanElement;
  private readonly icon: HTMLImageElement;
  private readonly svg: SVGSVGElement;
  private readonly shape: SVGPathElement;
  private readonly ring: SVGPathElement;
  private readonly hole: SVGPathElement;
  private station: BubbleStation | null = null;
  private visible = true;
  private size = { width: 0, height: 0 };
  /** Removes the bubble of the station no longer shown, once its name is back on the map. */
  private leave: (() => void) | null = null;
  private leaveTimer = 0;

  constructor(
    private readonly map: MapLibreMap,
    private readonly outline: () => [number, number][][],
  ) {
    this.root = document.createElement("div");
    // Positioned by the marker, sized to its name.
    this.root.style.cssText = "width:max-content;pointer-events:none;";
    const maskId = `station-bubble-mask-${Math.random().toString(36).slice(2)}`;
    this.svg = document.createElementNS(SVG, "svg");
    this.svg.style.cssText = `position:absolute;left:${-MARGIN}px;top:${-MARGIN}px;overflow:visible;`;
    const mask = document.createElementNS(SVG, "mask");
    mask.id = maskId;
    mask.setAttribute("maskUnits", "userSpaceOnUse");
    const all = document.createElementNS(SVG, "rect");
    all.setAttribute("fill", "white");
    all.setAttribute("width", "100%");
    all.setAttribute("height", "100%");
    this.hole = document.createElementNS(SVG, "path");
    this.hole.setAttribute("fill", "black");
    mask.append(all, this.hole);
    // The outline straddles the edge of the shape, filled over its inner half.
    this.ring = document.createElementNS(SVG, "path");
    this.ring.setAttribute("fill", "none");
    this.ring.setAttribute("stroke", "#ffffff");
    this.ring.setAttribute("stroke-width", String(OUTLINE * 2));
    this.ring.setAttribute("stroke-linejoin", "round");
    this.ring.setAttribute("mask", `url(#${maskId})`);
    this.shape = document.createElementNS(SVG, "path");
    this.svg.append(mask, this.ring, this.shape);
    const content = document.createElement("div");
    content.style.cssText =
      `position:relative;display:flex;align-items:center;height:${BOX.height}px;` +
      `padding:0 ${BOX.paddingRight}px 0 ${BOX.paddingLeft}px;margin-bottom:${TAIL.height}px;white-space:nowrap;` +
      `font:700 ${FONT_SIZE}px/1 var(--font-map),sans-serif;`;
    this.icon = document.createElement("img");
    this.icon.alt = "";
    this.icon.style.cssText = `width:${GLYPH_SIZE}px;height:${GLYPH_SIZE}px;transform:translate(${BOX.glyphShift[0]}px,${BOX.glyphShift[1]}px);`;
    this.label = document.createElement("span");
    content.append(this.icon, this.label);
    this.root.append(this.svg, content);
    this.marker = new Marker({ element: this.root, anchor: "bottom" });
    map.on("move", this.place);
    map.on("sourcedata", this.onSourceData);
  }

  /** Shows `station`, or nothing. */
  set(station: BubbleStation | null): void {
    this.cancelLeave();
    if (!station) {
      if (this.station) this.leaveOnceNamed();
      return;
    }
    this.station = station;
    this.ring.style.visibility = "";
    this.setLabel(station.name);
    if (this.icon.src !== station.glyph) this.icon.src = station.glyph;
    this.label.style.color = station.text;
    this.shape.setAttribute("fill", station.fill);
    this.shape.setAttribute("fill-opacity", String(station.opacity));
    this.marker.setLngLat([station.lon, station.lat]);
    if (!this.root.isConnected) this.marker.addTo(this.map);
    this.resize();
    this.place();
  }

  /**
   * The name after a space, each character as wide as its advance on the map:
   * the map neither kerns nor rounds like the page, the bubble keeps its width.
   */
  private setLabel(name: string): void {
    const advances = glyphAdvances(this.map, ` ${name}`);
    this.label.replaceChildren(
      ...[...` ${name}`].map((character, i) => {
        const span = document.createElement("span");
        span.textContent = character === " " ? "\u00a0" : character;
        span.style.cssText = `display:inline-block;width:${advances[i]}px;`;
        return span;
      }),
    );
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.place();
  }

  /** Redraws the outline once the tiles bring the shape of the station. */
  refresh(): void {
    this.place();
  }

  /**
   * Kept until the name of the station fades back in on the map, its outline
   * gone with that of the station: no blink between the two.
   */
  private leaveOnceNamed(): void {
    this.ring.style.visibility = "hidden";
    const leave = () => {
      this.cancelLeave();
      this.station = null;
      this.marker.remove();
    };
    // Zoomed out, no name comes back on the map: gone at once.
    if (this.map.getZoom() < LIFT_ZOOMS[0]) {
      leave();
      return;
    }
    this.leave = leave;
    this.map.once("idle", leave);
    // Idle may wait for tiles or trains: the name is placed long before.
    this.leaveTimer = window.setTimeout(leave, LEAVE_MAX_MS);
  }

  private cancelLeave(): void {
    if (this.leave) this.map.off("idle", this.leave);
    this.leave = null;
    window.clearTimeout(this.leaveTimer);
  }

  destroy(): void {
    this.cancelLeave();
    this.map.off("move", this.place);
    this.map.off("sourcedata", this.onSourceData);
    this.marker.remove();
  }

  private readonly onSourceData = (event: { isSourceLoaded?: boolean }) => {
    if (this.station && event.isSourceLoaded) this.place();
  };

  /** The box and the tail as one path, around the measured content. */
  private resize(): void {
    const width = this.root.offsetWidth;
    const height = BOX.height + TAIL.height;
    this.size = { width, height };
    const r = Math.min(BOX.radius, BOX.height / 2, width / 2);
    const h = BOX.height;
    const mid = width / 2;
    const d =
      `M${r + MARGIN},${MARGIN}H${width - r + MARGIN}A${r},${r} 0 0 1 ${width + MARGIN},${r + MARGIN}` +
      `V${h - r + MARGIN}A${r},${r} 0 0 1 ${width - r + MARGIN},${h + MARGIN}` +
      `H${mid + TAIL.halfWidth + MARGIN}L${mid + MARGIN},${height + MARGIN}L${mid - TAIL.halfWidth + MARGIN},${h + MARGIN}` +
      `H${r + MARGIN}A${r},${r} 0 0 1 ${MARGIN},${h - r + MARGIN}V${r + MARGIN}A${r},${r} 0 0 1 ${r + MARGIN},${MARGIN}Z`;
    this.shape.setAttribute("d", d);
    this.ring.setAttribute("d", d);
    this.svg.setAttribute("width", String(width + MARGIN * 2));
    this.svg.setAttribute("height", String(height + MARGIN * 2));
  }

  /** Lifts the tail onto the dot and masks the outline inside the shape of the station. */
  private readonly place = () => {
    const station = this.station;
    if (!station) return;
    const zoom = this.map.getZoom();
    // Shown at every zoom, unlike the other names.
    this.root.style.visibility = this.visible ? "" : "hidden";
    if (!this.visible) return;
    // Like the names: the bottom of the text lifted, the box 2 px below it, the tail 5 px below the box.
    const t = Math.min(Math.max((zoom - LIFT_ZOOMS[0]) / (LIFT_ZOOMS[1] - LIFT_ZOOMS[0]), 0), 1);
    const lift = (station.lift[0] + (station.lift[1] - station.lift[0]) * t) * FONT_SIZE - 2 - TAIL.height - 3;
    const offset: PointLike = [0, -lift];
    this.marker.setOffset(offset);
    const anchor = this.map.project([station.lon, station.lat]);
    // Top left corner of the svg, from the point of the station.
    const left = anchor.x - this.size.width / 2 - MARGIN;
    const top = anchor.y - lift - this.size.height - MARGIN;
    const d = this.outline()
      .map((ring) =>
        ring
          .map(([lon, lat], i) => {
            const p = this.map.project([lon, lat]);
            return `${i ? "L" : "M"}${(p.x - left).toFixed(1)},${(p.y - top).toFixed(1)}`;
          })
          .join("") + "Z",
      )
      .join("");
    this.hole.setAttribute("d", d);
  };
}

/** Shape of the glyphs the map keeps, inner to MapLibre: read with care. */
interface GlyphCache {
  style?: {
    glyphManager?: {
      entries?: Record<string, { glyphs?: Record<string, Record<string, { metrics?: { advance: number } } | null>> }>;
    };
  };
}

/** Context measuring the font of the names in the page, when the map has not the glyphs of a character. */
let measure: CanvasRenderingContext2D | null = null;

/**
 * Advance of each character of `text` on the map, in pixels: the one of its
 * glyph in the map font, else measured in the page and rounded like the
 * glyphs of the map.
 */
function glyphAdvances(map: MapLibreMap, text: string): number[] {
  const glyphs = (map as unknown as GlyphCache).style?.glyphManager?.entries?.[MAP_FONT]?.glyphs?.default;
  const scale = FONT_SIZE / GLYPH_EM;
  return [...text].map((character) => {
    const codePoint = character.codePointAt(0)!;
    const advance = glyphs?.[codePoint]?.metrics?.advance;
    if (advance !== undefined) return advance * scale;
    if (!measure) {
      measure = document.createElement("canvas").getContext("2d")!;
      const family = getComputedStyle(document.documentElement).getPropertyValue("--font-map") || "sans-serif";
      measure.font = `700 ${GLYPH_EM}px ${family}`;
    }
    return Math.round(measure.measureText(character).width) * scale;
  });
}
