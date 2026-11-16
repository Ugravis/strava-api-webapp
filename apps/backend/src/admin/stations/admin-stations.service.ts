import type {
  AdminStation,
  AdminStationNeighbor,
  AdminStationsOverview,
} from '@kilotrace/shared/admin';
import {
  mapTablePage,
  type TablePage,
  type TableQuery,
} from '@kilotrace/shared/table';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { Place } from '../../stations/place.entity';
import { runTableQuery, type TableSpec } from '../common/table-query';

const NAME = 'COALESCE(place.custom_name, place.name)';

const STATIONS_TABLE: TableSpec = {
  search: ['place.name', 'place.custom_name', 'place.osm_id::text'],
  sorts: {
    name: NAME,
    holders: 'place.holders',
    country: 'place.country_code',
    updatedAt: 'place.updated_at',
  },
  defaultSort: { id: 'holders', desc: true },
  tiebreak: 'place.id',
  facets: {
    zoneSource: { column: 'place.zone_source' },
    country: { column: 'place.country_code' },
    visibility: {
      options: {
        shown: 'place.hidden_at IS NULL',
        hidden: 'place.hidden_at IS NOT NULL',
      },
    },
    naming: {
      options: {
        osm: 'place.custom_name IS NULL',
        custom: 'place.custom_name IS NOT NULL',
      },
    },
    held: {
      options: { held: 'place.holders > 0', never: 'place.holders = 0' },
    },
  },
  groupings: {
    zoneSource: 'place.zone_source',
    country: 'place.country_code',
    visibility: `CASE WHEN place.hidden_at IS NULL THEN 'shown' ELSE 'hidden' END`,
  },
};

/** Columns of a station read by the table: its footprint left out, heavy. */
const COLUMNS = [
  'id',
  'osmType',
  'osmId',
  'name',
  'customName',
  'hiddenAt',
  'geom',
  'countryCode',
  'zoneSource',
  'holders',
  'updatedAt',
].map((column) => `place.${column}`);

/** The geometry of a point as TypeORM reads it. */
type Point = { coordinates: [number, number] };

/**
 * The train stations of the dataset, imported from OpenStreetMap: the
 * team renames or hides them, over the imports.
 */
@Injectable()
export class AdminStationsService {
  constructor(
    @InjectRepository(Place) private readonly places: Repository<Place>,
  ) {}

  async table(query: TableQuery): Promise<TablePage<AdminStation>> {
    const page = await runTableQuery(this.base(), query, STATIONS_TABLE);
    return mapTablePage(page, (stations) => this.rows(stations));
  }

  async station(id: number): Promise<AdminStation> {
    const station = await this.base()
      .andWhere('place.id = :id', { id })
      .getOne();
    if (!station)
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'Station not found');
    const [row] = await this.rows([station]);
    return row;
  }

  /** The stations linked to `id` by the railway, the nearest first. */
  async neighbors(id: number): Promise<AdminStationNeighbor[]> {
    await this.exists(id);
    const rows: {
      id: number;
      name: string | null;
      country_code: string | null;
      length_m: number;
      holders: number;
      hidden: boolean;
    }[] = await this.places.query(
      `SELECT p.id, COALESCE(p.custom_name, p.name) AS name, p.country_code, l.length_m,
         p.holders, p.hidden_at IS NOT NULL AS hidden
       FROM rail_links l
       JOIN places p ON p.id = CASE WHEN l.station_a = $1 THEN l.station_b ELSE l.station_a END
       WHERE l.station_a = $1 OR l.station_b = $1
       ORDER BY l.length_m`,
      [id],
    );
    return rows.map((row) => ({
      id: String(row.id),
      name: row.name,
      countryCode: row.country_code,
      lengthM: Math.round(row.length_m),
      holders: row.holders,
      hidden: row.hidden,
    }));
  }

  async overview(): Promise<AdminStationsOverview> {
    const [[totals], countries, [top], [collectors], [network], [latest]] =
      await Promise.all([
        this.places.query<Record<string, number>[]>(
          `SELECT count(*)::int AS total,
             count(*) FILTER (WHERE holders > 0)::int AS held,
             count(*) FILTER (WHERE hidden_at IS NOT NULL)::int AS hidden,
             count(*) FILTER (WHERE custom_name IS NOT NULL)::int AS renamed,
             count(*) FILTER (WHERE country_code IS NULL)::int AS without_country,
             count(*) FILTER (WHERE zone_source = 'osm')::int AS osm,
             count(*) FILTER (WHERE zone_source = 'rails')::int AS rails,
             count(*) FILTER (WHERE zone_source = 'point')::int AS point
           FROM places WHERE kind = 'station'`,
        ),
        this.places.query<{ code: string; stations: number }[]>(
          `SELECT country_code AS code, count(*)::int AS stations FROM places
           WHERE kind = 'station' AND country_code IS NOT NULL
           GROUP BY country_code ORDER BY stations DESC, code`,
        ),
        this.places.query<
          { id: number; name: string | null; holders: number }[]
        >(
          `SELECT id, COALESCE(custom_name, name) AS name, holders FROM places
           WHERE kind = 'station' AND holders > 0 ORDER BY holders DESC, id LIMIT 1`,
        ),
        this.places.query<{ count: number }[]>(
          `SELECT count(DISTINCT u.user_id)::int AS count FROM user_tiles u
           WHERE EXISTS (
             SELECT 1 FROM place_tiles t JOIN places p ON p.id = t.place_id AND p.kind = 'station'
             WHERE t.x = u.x AND t.y = u.y AND u.mask & (1::bigint << t.bit) <> 0
           )`,
        ),
        this.places.query<{ links: number; km: number }[]>(
          `SELECT count(*)::int AS links, COALESCE(round(sum(length_m) / 1000), 0)::int AS km FROM rail_links`,
        ),
        this.places.query<{ imported_at: Date }[]>(
          'SELECT imported_at FROM railway_imports ORDER BY id DESC LIMIT 1',
        ),
      ]);
    return {
      total: totals.total,
      held: totals.held,
      hidden: totals.hidden,
      renamed: totals.renamed,
      zoneSources: {
        osm: totals.osm,
        rails: totals.rails,
        point: totals.point,
      },
      countries,
      withoutCountry: totals.without_country,
      links: network.links,
      linksKm: network.km,
      top: top
        ? { id: String(top.id), name: top.name, holders: top.holders }
        : null,
      collectors: collectors.count,
      lastImportAt: latest?.imported_at.toISOString() ?? null,
    };
  }

  /** Its name for the site, null for the one of OpenStreetMap again; the tiles of the map follow (`updated_at`). */
  async rename(id: number, name: string | null): Promise<void> {
    const station = await this.exists(id);
    const custom = name?.trim() || null;
    await this.places.update(id, {
      customName: custom === station.name ? null : custom,
      updatedAt: new Date(),
    });
  }

  /** Hidden from the site, or shown again; the tiles of the map follow (`updated_at`). */
  async setHidden(id: number, hidden: boolean): Promise<void> {
    const station = await this.exists(id);
    if (hidden === (station.hiddenAt !== null)) return;
    const now = new Date();
    await this.places.update(id, {
      hiddenAt: hidden ? now : null,
      updatedAt: now,
    });
  }

  private base() {
    return this.places
      .createQueryBuilder('place')
      .select(COLUMNS)
      .where(`place.kind = 'station'`);
  }

  private async exists(id: number): Promise<Place> {
    const station = await this.places.findOne({
      select: { id: true, name: true, hiddenAt: true },
      where: { id, kind: 'station' },
    });
    if (!station)
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'Station not found');
    return station;
  }

  /** The stations as the API answers them, their links and zones counted for all of them at once. */
  private async rows(stations: Place[]): Promise<AdminStation[]> {
    if (stations.length === 0) return [];
    const ids = stations.map((station) => station.id);
    const [links, zones] = await Promise.all([
      this.places.query<{ id: number; links: number; length_m: number }[]>(
        `SELECT s.id, count(*)::int AS links, sum(l.length_m) AS length_m
         FROM rail_links l, unnest(ARRAY[l.station_a, l.station_b]) AS s(id)
         WHERE (l.station_a = ANY($1) OR l.station_b = ANY($1)) AND s.id = ANY($1)
         GROUP BY s.id`,
        [ids],
      ),
      this.places.query<{ id: number; tiles: number }[]>(
        `SELECT place_id AS id, count(*)::int AS tiles FROM place_tiles
         WHERE place_id = ANY($1) GROUP BY place_id`,
        [ids],
      ),
    ]);
    const linksOf = new Map(links.map((row) => [row.id, row]));
    const tilesOf = new Map(zones.map((row) => [row.id, row.tiles]));
    return stations.map((station) => {
      const [lon, lat] = (station.geom as unknown as Point).coordinates;
      const link = linksOf.get(station.id);
      return {
        id: String(station.id),
        name: station.customName ?? station.name,
        osmName: station.name,
        customName: station.customName,
        hiddenAt: station.hiddenAt?.toISOString() ?? null,
        osmType: station.osmType,
        osmId: station.osmId,
        countryCode: station.countryCode,
        lon,
        lat,
        zoneSource: station.zoneSource,
        zoneTiles: tilesOf.get(station.id) ?? 0,
        links: link?.links ?? 0,
        linksM: Math.round(link?.length_m ?? 0),
        holders: station.holders,
        updatedAt: station.updatedAt.toISOString(),
      };
    });
  }
}
