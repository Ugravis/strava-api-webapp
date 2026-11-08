import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import sharp from 'sharp';
import { DataSource } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { rectanglesSql } from './map-tile-sql';
import { TILE_ZOOM } from './tile-grid';

/** Light or dark, as the map. */
export const PREVIEW_THEMES = ['light', 'dark'] as const;
export type PreviewTheme = (typeof PREVIEW_THEMES)[number];

/** Smallest window of the preview, in large tiles: about 70 × 40 km in France. */
const WINDOW_WIDTH = 40;
const WINDOW_HEIGHT = 24;
/** Pixels per large tile in the smallest window: 800 × 480 pixels, sharp at twice the size of the card. */
const TILE_PX = 20;
/** Scales of the window, tried in turn until the tiles no longer fill it. */
const WINDOW_SCALES = [1, 2, 4, 8, 16];
/** Share of the window covered by tiles beyond which it is enlarged, so that their outline shows. */
const MAX_FILL = 0.2;
/** Bumped when the drawing changes, so that the stored previews are drawn again. */
const PREVIEW_FORMAT = 'p4';
const PREVIEW_CONTENT_TYPE = 'image/webp';

const WORLD_HALF_M = 20037508.342789244;
/** Web Mercator meters to large tiles, the unit of the drawing. */
const TILE_SCALE = 2 ** TILE_ZOOM / (2 * WORLD_HALF_M);

/** Colors of the map style of the frontend (`map-style.ts`). */
const PALETTES: Record<PreviewTheme, Record<string, string>> = {
  light: {
    water: '#4d77b2',
    land: '#e4e0da',
    country: '#e8d4ae',
    countryOpacity: '0.85',
    boundary: '#5b4a35',
    rail: '#7d8380',
    tile: '#16a34a',
    tileOpacity: '0.4',
    cluster: '#f4fbf6',
    otherClustersOpacity: '0.2',
    tileOutline: '#14532d',
    station: '#6d28d9',
    stationCasing: '#ffffff',
    railLink: '#6d28d9',
  },
  dark: {
    water: '#132a45',
    land: '#1f1e1c',
    country: '#3b3226',
    countryOpacity: '0.85',
    boundary: '#a1968a',
    rail: '#5b605d',
    tile: '#22c55e',
    tileOpacity: '0.35',
    cluster: '#0f1f17',
    otherClustersOpacity: '0.25',
    tileOutline: '#4ade80',
    station: '#a78bfa',
    stationCasing: '#1f1e1c',
    railLink: '#a78bfa',
  },
};

/** Shapes of the window, as SVG path data in large tiles. */
interface PreviewShapes {
  land: string | null;
  /** Land of the countries the user visited, tinted as on the map. */
  visitedLand: string | null;
  borders: string | null;
  rails: string | null;
  /** Links between two visited stations: the railway unlocked. */
  railLinks: string | null;
  tiles: string | null;
  maxCluster: string | null;
  otherClusters: string | null;
  stations: { x: number; y: number }[];
}

/** The window, its top left corner in large tiles, `scale` times the smallest one. */
interface PreviewWindow {
  x: number;
  y: number;
  scale: number;
}

export interface MapPreview {
  /** Changes with the tiles of the user: the entity tag of the image. */
  tag: string;
  image: Buffer;
}

/**
 * Image of the area where the user visited the most large tiles: the land,
 * the borders and the railway drawn from our own geometries, the large
 * tiles and the stations visited over them. Drawn on demand once per
 * version of the tiles and stored, as it is seen on every visit of the
 * dashboard.
 */
@Injectable()
export class MapPreviewService {
  private readonly logger = new Logger(MapPreviewService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  /** Entity tag of the preview, null without any tile. */
  async tag(userId: string, theme: PreviewTheme): Promise<string | null> {
    const [row]: { version: string }[] = await this.dataSource.query(
      `SELECT m.version::text FROM user_tile_metrics m
       WHERE m.user_id = $1 AND EXISTS (SELECT 1 FROM user_tiles WHERE user_id = $1)`,
      [userId],
    );
    return row ? `"${PREVIEW_FORMAT}-${theme}-${row.version}"` : null;
  }

  /** The preview of the user, drawn if not stored yet; null without any tile. */
  async preview(
    userId: string,
    theme: PreviewTheme,
  ): Promise<MapPreview | null> {
    const tag = await this.tag(userId, theme);
    if (!tag) {
      return null;
    }
    const key = `${keyPrefix(userId, theme)}${tag.slice(1, -1)}.webp`;
    const stored = await this.storage.get(key);
    if (stored) {
      return { tag, image: await bufferOf(stored.body) };
    }
    const window = await this.densestWindow(userId);
    if (!window) {
      return null;
    }
    const image = await sharp(
      Buffer.from(
        svgOf(window, await this.shapes(userId, window), PALETTES[theme]),
      ),
    )
      .webp({ quality: 85 })
      .toBuffer();
    // The previews of the previous versions are no longer served.
    await this.deleteQuietly(keyPrefix(userId, theme));
    await this.storage.put(key, image, PREVIEW_CONTENT_TYPE);
    return { tag, image };
  }

  /** Removes the previews of the user, along with the account. */
  async deleteFor(userId: string): Promise<void> {
    await this.deleteQuietly(`map-previews/${userId}/`);
  }

  /**
   * Window centered on the area where the user visited the most large tiles,
   * enlarged while they fill much of it: the tiles counted by blocks of half
   * the smallest window, the best square of 2 × 2 blocks kept, its tiles
   * giving the center.
   */
  private async densestWindow(userId: string): Promise<PreviewWindow | null> {
    const [center]: { x: number; y: number }[] = await this.dataSource.query(
      `WITH blocks AS (
         SELECT x / ${WINDOW_WIDTH / 2} AS bx, y / ${WINDOW_HEIGHT / 2} AS bly,
           count(*) AS n, sum(x) AS sx, sum(y) AS sy
         FROM user_tiles WHERE user_id = $1 GROUP BY 1, 2
       )
       SELECT (sum(b.sx) / sum(b.n))::float8 + 0.5 AS x,
         (sum(b.sy) / sum(b.n))::float8 + 0.5 AS y
       FROM blocks a JOIN blocks b
         ON b.bx BETWEEN a.bx AND a.bx + 1 AND b.bly BETWEEN a.bly AND a.bly + 1
       GROUP BY a.bx, a.bly ORDER BY sum(b.n) DESC LIMIT 1`,
      [userId],
    );
    if (!center) {
      return null;
    }
    // Tiles within the window at each scale, around the same center.
    const [counts]: Record<string, number>[] = await this.dataSource.query(
      `SELECT ${WINDOW_SCALES.map(
        (scale) =>
          `count(*) FILTER (WHERE abs(x + 0.5 - $2) < ${(WINDOW_WIDTH * scale) / 2}
             AND abs(y + 0.5 - $3) < ${(WINDOW_HEIGHT * scale) / 2})::int AS s${scale}`,
      ).join(', ')}
       FROM user_tiles WHERE user_id = $1`,
      [userId, center.x, center.y],
    );
    const scale =
      WINDOW_SCALES.find(
        (scale) =>
          counts[`s${scale}`] <=
          MAX_FILL * WINDOW_WIDTH * WINDOW_HEIGHT * scale ** 2,
      ) ?? WINDOW_SCALES[WINDOW_SCALES.length - 1];
    return {
      x: center.x - (WINDOW_WIDTH * scale) / 2,
      y: center.y - (WINDOW_HEIGHT * scale) / 2,
      scale,
    };
  }

  /**
   * Shapes within the window, moved to large tiles: `ST_AsSVG` flips the
   * vertical axis, so the meters are scaled from the top of the world.
   */
  private async shapes(
    userId: string,
    window: PreviewWindow,
  ): Promise<PreviewShapes> {
    const minX = Math.floor(window.x);
    const minY = Math.floor(window.y);
    const maxX = Math.ceil(window.x + WINDOW_WIDTH * window.scale);
    const maxY = Math.ceil(window.y + WINDOW_HEIGHT * window.scale);
    // Half a pixel in meters: the tolerance of the simplified shapes.
    const tolerance = (0.5 * window.scale) / TILE_PX / TILE_SCALE;
    const toTiles = (geometry: string) =>
      `ST_AsSVG(ST_TransScale(${geometry}, ${WORLD_HALF_M}, ${-WORLD_HALF_M}, ${TILE_SCALE}, ${TILE_SCALE}), 0, 3)`;
    const [row]: Omit<PreviewShapes, 'stations'>[] =
      await this.dataSource.query(
        // One large tile around the window, so that no outline is cut at its edges.
        `WITH bounds AS (
         SELECT ST_MakeEnvelope(
           ${-WORLD_HALF_M} + ($2 - 1) / ${TILE_SCALE}, ${WORLD_HALF_M} - ($5 + 1) / ${TILE_SCALE},
           ${-WORLD_HALF_M} + ($4 + 1) / ${TILE_SCALE}, ${WORLD_HALF_M} - ($3 - 1) / ${TILE_SCALE}, 3857
         ) AS envelope
       ),
       countries AS MATERIALIZED (
         SELECT p.country_code AS code,
           ST_SimplifyPreserveTopology(ST_Union(ST_ClipByBox2D(p.geom, b.envelope)), ${tolerance}) AS geom
         FROM country_parts p, bounds b
         WHERE p.geom && b.envelope GROUP BY p.country_code
       ),
       visited_land AS (
         SELECT ST_CollectionExtract(ST_Collect(c.geom), 3) AS geom FROM countries c
         WHERE EXISTS (
           SELECT 1 FROM user_tiles u JOIN tile_countries t ON t.x = u.x AND t.y = u.y
           WHERE u.user_id = $1 AND t.country_code = c.code
         )
       ),
       land AS MATERIALIZED (SELECT ST_CollectionExtract(ST_Union(geom), 3) AS geom FROM countries),
       -- The outlines of the countries, but the coasts.
       borders AS (
         SELECT ST_CollectionExtract(ST_Collect(ST_Difference(ST_Boundary(c.geom), ST_Buffer(ST_Boundary(l.geom), ${2 * tolerance}))), 2) AS geom
         FROM countries c, land l
       ),
       rails AS (
         SELECT ST_Collect(ST_Simplify(ST_Transform(r.geom, 3857), ${tolerance})) AS geom
         FROM rail_links r, bounds b
         WHERE r.geom && ST_Transform(b.envelope, 4326)
       ),
       visited_stations AS MATERIALIZED (
         SELECT p.id FROM user_tiles u JOIN places p ON p.x = u.x AND p.y = u.y
         WHERE u.user_id = $1 AND p.kind = 'station' AND u.mask & (1::bigint << p.bit) <> 0
       ),
       rail_links_unlocked AS (
         SELECT ST_Collect(ST_Simplify(ST_Transform(r.geom, 3857), ${tolerance})) AS geom
         FROM rail_links r, bounds b
         WHERE r.geom && ST_Transform(b.envelope, 4326)
           AND r.station_a IN (SELECT id FROM visited_stations)
           AND r.station_b IN (SELECT id FROM visited_stations)
       ),
       cells AS MATERIALIZED (
         SELECT x, y, in_max_cluster, in_cluster FROM user_tiles
         WHERE user_id = $1 AND x BETWEEN $2 - 1 AND $4 AND y BETWEEN $3 - 1 AND $5
       ),
       tiles AS (
         SELECT ST_Union(geom) AS geom FROM (${rectanglesSql('cells', TILE_ZOOM)}) r
       ),
       max_cluster AS (
         SELECT ST_Union(geom) AS geom
         FROM (${rectanglesSql('(SELECT x, y FROM cells WHERE in_max_cluster) c', TILE_ZOOM)}) r
       ),
       other_clusters AS (
         SELECT ST_Union(geom) AS geom
         FROM (${rectanglesSql('(SELECT x, y FROM cells WHERE in_cluster AND NOT in_max_cluster) c', TILE_ZOOM)}) r
       )
       SELECT (SELECT ${toTiles('geom')} FROM land) AS land,
         (SELECT ${toTiles('geom')} FROM visited_land) AS "visitedLand",
         (SELECT ${toTiles('geom')} FROM borders) AS borders,
         (SELECT ${toTiles('geom')} FROM rails) AS rails,
         (SELECT ${toTiles('geom')} FROM rail_links_unlocked) AS "railLinks",
         (SELECT ${toTiles('geom')} FROM tiles) AS tiles,
         (SELECT ${toTiles('geom')} FROM max_cluster) AS "maxCluster",
         (SELECT ${toTiles('geom')} FROM other_clusters) AS "otherClusters"`,
        [userId, minX, minY, maxX, maxY],
      );
    const stations: { x: number; y: number }[] = await this.dataSource.query(
      `SELECT (ST_X(m.geom) + ${WORLD_HALF_M}) * ${TILE_SCALE} AS x,
         (${WORLD_HALF_M} - ST_Y(m.geom)) * ${TILE_SCALE} AS y
       FROM (
         SELECT ST_Transform(p.geom, 3857) AS geom FROM user_tiles u
         JOIN places p ON p.x = u.x AND p.y = u.y
         WHERE u.user_id = $1 AND p.kind = 'station' AND u.mask & (1::bigint << p.bit) <> 0
           AND u.x BETWEEN $2 AND $4 AND u.y BETWEEN $3 AND $5
       ) m`,
      [userId, minX, minY, maxX, maxY],
    );
    return { ...row, stations };
  }

  private async deleteQuietly(prefix: string): Promise<void> {
    try {
      await this.storage.deleteAll(prefix);
    } catch (error) {
      this.logger.warn(
        `Failed to delete the previews ${prefix}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function keyPrefix(userId: string, theme: PreviewTheme): string {
  return `map-previews/${userId}/${PREVIEW_FORMAT}-${theme}-`;
}

async function bufferOf(body: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** The drawing, in large tiles: one unit is `TILE_PX / scale` pixels. */
export function svgOf(
  window: PreviewWindow,
  shapes: PreviewShapes,
  colors: Record<string, string>,
): string {
  const width = WINDOW_WIDTH * window.scale;
  const height = WINDOW_HEIGHT * window.scale;
  /** `pixels` in large tiles. */
  const px = (pixels: number) => ((pixels * window.scale) / TILE_PX).toFixed(3);
  const path = (d: string | null, attributes: string) =>
    d ? `<path d="${d}" ${attributes}/>` : '';
  const stations = shapes.stations
    .map(
      ({ x, y }) =>
        `<circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${px(4)}" fill="${colors.station}" stroke="${colors.stationCasing}" stroke-width="${px(1.5)}"/>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WINDOW_WIDTH * TILE_PX}" height="${WINDOW_HEIGHT * TILE_PX}" viewBox="${window.x.toFixed(3)} ${window.y.toFixed(3)} ${width} ${height}">
<rect x="${window.x - 1}" y="${window.y - 1}" width="${width + 2}" height="${height + 2}" fill="${colors.water}"/>
${path(shapes.land, `fill="${colors.land}"`)}
${path(shapes.visitedLand, `fill="${colors.country}" fill-opacity="${colors.countryOpacity}"`)}
${path(shapes.borders, `fill="none" stroke="${colors.boundary}" stroke-opacity="0.5" stroke-width="${px(1.2)}" stroke-dasharray="${px(6)} ${px(3)}"`)}
${path(shapes.rails, `fill="none" stroke="${colors.rail}" stroke-opacity="0.8" stroke-width="${px(1.2)}"`)}
${path(shapes.tiles, `fill="${colors.tile}" fill-opacity="${colors.tileOpacity}"`)}
${path(shapes.otherClusters, `fill="${colors.cluster}" fill-opacity="${colors.otherClustersOpacity}"`)}
${path(shapes.maxCluster, `fill="${colors.cluster}"`)}
${path(shapes.tiles, `fill="none" stroke="${colors.tileOutline}" stroke-opacity="0.8" stroke-width="${px(1)}" stroke-linejoin="round"`)}
${path(shapes.railLinks, `fill="none" stroke="${colors.stationCasing}" stroke-width="${px(3.5)}" stroke-linecap="round" stroke-linejoin="round"`)}
${path(shapes.railLinks, `fill="none" stroke="${colors.railLink}" stroke-width="${px(2)}" stroke-linecap="round" stroke-linejoin="round"`)}
${stations}
</svg>`;
}
