import type { AdminMapStation, AdminMapVersion } from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CountriesService } from '../../countries/countries.service';
import { RAIL_DETAIL_ZOOM } from '../../stations/import/rail-strokes';
import { stationName } from '../../stations/shown-stations';
import { SUBTILE_ZOOM, TILE_ZOOM } from '../../tiles/tile-grid';

const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);
const MVT_EXTENT = 4096;
const MVT_BUFFER = 64;
/** As on the site map: the footprints and zones zoomed in only. */
const FOOTPRINTS_MIN_ZOOM = 12;
/** Zoom from which the public map draws the dots of the stations: none in the tiles before. */
const DOTS_MIN_ZOOM = 5;
/** Up to this zoom, the countries tiles are kept in memory (341 tiles at most). */
const COUNTRIES_CACHE_MAX_ZOOM = 4;
/** Changes the URL of the tiles when their layers change, beyond the data. */
const TILE_FORMAT = 9;
/** Grid, in tile units, the dots forced below `DOTS_MIN_ZOOM` are deduplicated on: about a pixel of a 512 px tile. */
const DOT_GRID = MVT_EXTENT / 512;

/** Layers of the station tiles of the back office. */
export const ADMIN_MAP_LAYERS = {
  stations: 'stations',
  footprints: 'station-footprints',
  zones: 'station-zones',
  rails: 'rails',
} as const;

/**
 * The whole dataset of the public map, for the team to audit it with the
 * same layers: every station, hidden ones included, the railway between
 * them, and the tile shapes of every country.
 */
@Injectable()
export class AdminMapService {
  /** Countries tiles zoomed out, by version: at most a few hundred, each long to merge. */
  private countriesCache: {
    version: string;
    tiles: Map<string, Promise<Buffer>>;
  } = { version: '', tiles: new Map() };

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly countries: CountriesService,
  ) {}

  /** Changes with each import, change of a station, computation of the lines of the railway or of the countries: part of the URL of the tiles. */
  async version(): Promise<AdminMapVersion> {
    const [row]: { stations: string; countries: string }[] =
      await this.dataSource.query(
        `SELECT
           concat((SELECT max(id) FROM railway_imports), '-',
             (SELECT floor(extract(epoch FROM max(updated_at)))::bigint FROM places), '-',
             (SELECT max(id) FROM rail_strokes)) AS stations,
           concat((SELECT max(id) FROM country_parts), '-',
             (SELECT floor(extract(epoch FROM max(computed_at)))::bigint FROM countries)) AS countries`,
      );
    return {
      stations: `${row.stations}-${TILE_FORMAT}`,
      countries: `${row.countries}-${TILE_FORMAT}`,
    };
  }

  /** A station, hidden or not, with the bounds of its zone, as the public map centers it. */
  async station(id: number): Promise<AdminMapStation> {
    const [row]: {
      name: string | null;
      lon: number;
      lat: number;
      west: number | null;
      south: number | null;
      east: number | null;
      north: number | null;
    }[] = await this.dataSource.query(
      `SELECT ${stationName()} AS name, ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat,
         ST_XMin(z.box) AS west, ST_YMin(z.box) AS south, ST_XMax(z.box) AS east, ST_YMax(z.box) AS north
       FROM places p
       LEFT JOIN LATERAL (
         SELECT ST_Transform(ST_SetSRID(ST_Extent(ST_TileEnvelope(${SUBTILE_ZOOM},
           t.x * ${SUBTILES_PER_SIDE} + t.bit % ${SUBTILES_PER_SIDE},
           t.y * ${SUBTILES_PER_SIDE} + t.bit / ${SUBTILES_PER_SIDE}))::geometry, 3857), 4326) AS box
         FROM place_tiles t WHERE t.place_id = p.id
       ) z ON true
       WHERE p.id = $1 AND p.kind = 'station'`,
      [id],
    );
    if (!row)
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'Station not found');
    const { west, south, east, north } = row;
    return {
      id,
      name: row.name,
      lon: row.lon,
      lat: row.lat,
      bounds:
        west === null || south === null || east === null || north === null
          ? null
          : { west, south, east, north },
    };
  }

  /**
   * Every station with its name and whether it is hidden, the railway, and
   * zoomed in the footprints and zone tiles, with the properties of the
   * tiles of the public map: the same layers draw them.
   */
  async stationsTile(
    zoom: number,
    x: number,
    y: number,
    everyDot = false,
  ): Promise<Buffer> {
    // Forced zoomed out, the stations are one per pixel: drawn the same, the tile kept light.
    const dedupe = everyDot && zoom < DOTS_MIN_ZOOM;
    const [row]: { tile: Buffer | null }[] = await this.dataSource.query(
      `WITH bounds AS (
         SELECT ST_TileEnvelope($1, $2, $3) AS envelope, 360.0 / (${MVT_EXTENT} * 2 ^ $1) AS unit
       ),
       wide AS (
         -- Kept within the world: past the antimeridian, the box would wrap to the other side of it.
         SELECT ST_Transform(ST_ClipByBox2D(ST_Expand(envelope,
           (ST_XMax(envelope) - ST_XMin(envelope)) * ${MVT_BUFFER / MVT_EXTENT}), ST_TileEnvelope(0, 0, 0)), 4326) AS box
         FROM bounds
       ),
       -- As on the public map, the dots of the stations from their zoom only, unless forced: the railway alone zoomed out.
       all_points AS (
         SELECT p.id, ${stationName()} AS name, p.hidden_at IS NOT NULL AS hidden,
           ST_AsMVTGeom(ST_Transform(p.geom, 3857), b.envelope, ${MVT_EXTENT}, ${MVT_BUFFER}, true) AS geom
         FROM places p, bounds b, wide w
         WHERE ${everyDot ? 'true' : `$1 >= ${DOTS_MIN_ZOOM}`} AND p.kind = 'station' AND p.geom && w.box
       ),
       points AS (
         ${
           dedupe
             ? `SELECT DISTINCT ON (ST_SnapToGrid(geom, ${DOT_GRID})) * FROM all_points
                WHERE geom IS NOT NULL ORDER BY ST_SnapToGrid(geom, ${DOT_GRID}), hidden, id`
             : 'SELECT * FROM all_points'
         }
       ),
       -- Zoomed out, every line of the railway, simplified at the import; then every segment.
       rails AS (
         -- Simplified to the pixel, the short lines kept as stubs: none lost zoomed out.
         SELECT ST_AsMVTGeom(ST_Transform(ST_Simplify(r.geom, b.unit, true), 3857), b.envelope, ${MVT_EXTENT}, ${MVT_BUFFER}, true) AS geom
         FROM rail_strokes r, bounds b, wide w
         WHERE $1 < ${RAIL_DETAIL_ZOOM} AND r.geom && w.box
         UNION ALL
         SELECT ST_AsMVTGeom(ST_Transform(ST_Simplify(s.geom, b.unit, true), 3857), b.envelope, ${MVT_EXTENT}, ${MVT_BUFFER}, true) AS geom
         FROM rail_segments s, bounds b, wide w
         WHERE $1 >= ${RAIL_DETAIL_ZOOM} AND s.geom && w.box
       ),
       footprints AS (
         SELECT p.id, ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat, p.hidden_at IS NOT NULL AS hidden,
           ST_AsMVTGeom(ST_Transform(p.footprint, 3857), b.envelope, ${MVT_EXTENT}, ${MVT_BUFFER}, true) AS geom
         FROM places p, bounds b, wide w
         WHERE $1 >= ${FOOTPRINTS_MIN_ZOOM} AND p.kind = 'station' AND p.footprint && w.box
       ),
       -- One polygon per zone, its small tiles merged; one large tile more on each side covers the buffer.
       zones AS (
         SELECT t.place_id AS id, ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat, p.hidden_at IS NOT NULL AS hidden,
           ST_AsMVTGeom(ST_Union(ST_TileEnvelope(${SUBTILE_ZOOM},
             t.x * ${SUBTILES_PER_SIDE} + t.bit % ${SUBTILES_PER_SIDE},
             t.y * ${SUBTILES_PER_SIDE} + t.bit / ${SUBTILES_PER_SIDE})),
             (SELECT envelope FROM bounds), ${MVT_EXTENT}, ${MVT_BUFFER}, true) AS geom
         FROM place_tiles t
         JOIN places p ON p.id = t.place_id AND p.kind = 'station'
         WHERE $1 >= ${FOOTPRINTS_MIN_ZOOM}
           AND t.x BETWEEN floor($2 * 2.0 ^ (${TILE_ZOOM} - $1))::int - 1 AND ceil(($2 + 1) * 2.0 ^ (${TILE_ZOOM} - $1))::int
           AND t.y BETWEEN floor($3 * 2.0 ^ (${TILE_ZOOM} - $1))::int - 1 AND ceil(($3 + 1) * 2.0 ^ (${TILE_ZOOM} - $1))::int
         GROUP BY t.place_id, p.geom, p.hidden_at
       )
       SELECT coalesce((
           SELECT ST_AsMVT(rails, '${ADMIN_MAP_LAYERS.rails}', ${MVT_EXTENT}, 'geom')
           FROM rails WHERE geom IS NOT NULL
         ), ''::bytea) || coalesce((
           SELECT ST_AsMVT(points, '${ADMIN_MAP_LAYERS.stations}', ${MVT_EXTENT}, 'geom', 'id')
           FROM points WHERE geom IS NOT NULL
         ), ''::bytea) || coalesce((
           SELECT ST_AsMVT(footprints, '${ADMIN_MAP_LAYERS.footprints}', ${MVT_EXTENT}, 'geom', 'id')
           FROM footprints WHERE geom IS NOT NULL
         ), ''::bytea) || coalesce((
           SELECT ST_AsMVT(zones, '${ADMIN_MAP_LAYERS.zones}', ${MVT_EXTENT}, 'geom', 'id')
           FROM zones WHERE geom IS NOT NULL
         ), ''::bytea) AS tile`,
      [zoom, x, y],
    );
    return row.tile ?? Buffer.alloc(0);
  }

  /**
   * The tile shapes of every country merged, as the public map draws the
   * countries a member visited: the same tiles, all of them visited.
   */
  async countriesTile(zoom: number, x: number, y: number): Promise<Buffer> {
    if (zoom > COUNTRIES_CACHE_MAX_ZOOM) {
      return this.countries.shapesTile(
        zoom,
        x,
        y,
        await this.countries.codes(),
      );
    }
    // Zoomed out, every country merged is costly: each tile computed once per version, shared while it is.
    const { countries } = await this.version();
    if (this.countriesCache.version !== countries) {
      this.countriesCache = { version: countries, tiles: new Map() };
    }
    const { tiles } = this.countriesCache;
    const key = `${zoom}/${x}/${y}`;
    let tile = tiles.get(key);
    if (!tile) {
      tile = this.countries
        .codes()
        .then((codes) => this.countries.shapesTile(zoom, x, y, codes));
      tiles.set(key, tile);
      tile.catch(() => tiles.delete(key));
    }
    return tile;
  }
}
