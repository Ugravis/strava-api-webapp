import { parseOplLine } from './osm-opl';
import { metersBetween, RailwayDataBuilder } from './railway-data';
import {
  platformGroups,
  stationZones,
  type ZoneFeature,
  type ZoneInput,
  zoneSource,
} from './station-zones';

const LAT = 45;
const LON = 5;
/** About 1 m of latitude, of longitude at latitude 45. */
const MY = 1 / 111_320;
const MX = 1 / (111_320 * Math.cos((LAT * Math.PI) / 180));

/** OPL lines, ids sorted by the builder like osmium does. */
class Fixture {
  nodes: string[] = [];
  ways: string[] = [];
  relations: string[] = [];
  private nextNode = 1000;

  node(dx: number, dy: number, tags = ''): number {
    const id = this.nextNode++;
    this.nodes.push(`n${id} T${tags} x${LON + dx * MX} y${LAT + dy * MY}`);
    return id;
  }

  way(id: number, tags: string, points: [number, number][]): number[] {
    const ids = points.map(([dx, dy]) => this.node(dx, dy));
    this.ways.push(`w${id} T${tags} N${ids.map((n) => `n${n}`).join(',')}`);
    return ids;
  }

  /** A closed square of `side` metres centred on (dx, dy). */
  square(id: number, tags: string, dx: number, dy: number, side: number) {
    const h = side / 2;
    const ids = (
      [
        [dx - h, dy - h],
        [dx + h, dy - h],
        [dx + h, dy + h],
        [dx - h, dy + h],
      ] as [number, number][]
    ).map(([x, y]) => this.node(x, y));
    this.ways.push(
      `w${id} T${tags} N${[...ids, ids[0]].map((n) => `n${n}`).join(',')}`,
    );
  }

  zones(): ZoneInput[] {
    const builder = new RailwayDataBuilder();
    const byId = (line: string) => Number(line.split(' ')[0].slice(1));
    for (const line of [
      ...[...this.nodes].sort((a, b) => byId(a) - byId(b)),
      ...[...this.ways].sort((a, b) => byId(a) - byId(b)),
      ...[...this.relations].sort((a, b) => byId(a) - byId(b)),
    ]) {
      builder.add(parseOplLine(line)!);
    }
    const data = builder.finish();
    const kept = data.stations.flatMap((s, i) =>
      s.exclusion === null ? [i] : [],
    );
    return stationZones(data, kept);
  }
}

/** A station at the origin on an east-west track of `length` metres, served by a route. */
function stationOnTrack(length = 2000): Fixture {
  const f = new Fixture();
  const station = f.node(0, 0, 'railway=station,name=S');
  f.way(1, 'railway=rail', [
    [-length / 2, 0],
    [length / 2, 0],
  ]);
  f.relations.push(`r1 Ttype=route,route=train Mn${station}@stop,w1@`);
  return f;
}

const length = (lines: [number, number][][]) =>
  lines.reduce(
    (total, line) =>
      total +
      line.slice(1).reduce((sum, p, i) => sum + metersBetween(line[i], p), 0),
    0,
  );

const platform = (
  key: string,
  underground: boolean,
  dx: number,
  dy: number,
): ZoneFeature => ({
  key,
  platform: true,
  stationBuilding: false,
  roof: false,
  underground,
  parts: [
    [
      [LON + (dx - 100) * MX, LAT + dy * MY],
      [LON + (dx + 100) * MX, LAT + dy * MY],
    ],
  ],
});

describe('platformGroups', () => {
  it('chains the platforms of a level within 50 m, apart from the underground ones', () => {
    const groups = platformGroups([
      platform('w1', false, 0, 0),
      platform('w2', false, 0, 30),
      platform('w3', false, 0, 70),
      platform('w4', true, 0, 10),
      platform('w5', false, 0, 300),
    ]);
    expect(groups.map((g) => g.map((p) => p.key).sort())).toEqual([
      ['w1', 'w2', 'w3'],
      ['w4'],
      ['w5'],
    ]);
  });
});

describe('zoneSource', () => {
  it('takes the footprint, else the tracks, else the point', () => {
    const line: [number, number][] = [
      [0, 0],
      [1, 1],
    ];
    expect(
      zoneSource({ clusters: [[line]], buildings: [], rails: [line] }),
    ).toBe('osm');
    expect(zoneSource({ clusters: [], buildings: [line], rails: [] })).toBe(
      'osm',
    );
    expect(zoneSource({ clusters: [], buildings: [], rails: [line] })).toBe(
      'rails',
    );
    expect(zoneSource({ clusters: [], buildings: [], rails: [] })).toBe(
      'point',
    );
  });
});

describe('stationZones', () => {
  it('walks 100 m of track on each side of a station without platforms', () => {
    const [zone] = stationOnTrack().zones();
    expect(zone.source).toBe('rails');
    expect(length(zone.rails)).toBeCloseTo(200, 0);
  });

  it('follows every way met at the end of a track', () => {
    const f = new Fixture();
    const station = f.node(0, 0, 'railway=station,name=S');
    // Two branches from the east end, 60 m from the point: too far to start a walk.
    const [, node] = f.way(1, 'railway=rail', [
      [-500, 0],
      [60, 0],
    ]);
    const east = f.node(500, 50);
    const south = f.node(500, -50);
    f.ways.push(`w2 Trailway=rail Nn${node},n${east}`);
    f.ways.push(`w3 Trailway=rail Nn${node},n${south}`);
    f.relations.push(`r1 Ttype=route,route=train Mn${station}@stop,w1@`);
    const [zone] = f.zones();
    // 100 m west, 60 m east then 40 m along each branch.
    expect(length(zone.rails)).toBeCloseTo(100 + 60 + 40 + 40, 0);
  });

  it('never walks a siding nor a far track', () => {
    const f = stationOnTrack();
    f.way(2, 'railway=rail,service=siding', [
      [-500, 10],
      [500, 10],
    ]);
    f.way(3, 'railway=rail', [
      [-500, 100],
      [500, 100],
    ]);
    const [zone] = f.zones();
    expect(length(zone.rails)).toBeCloseTo(200, 0);
  });

  it('draws the footprint from the platforms, roofs and station buildings', () => {
    const f = stationOnTrack();
    f.way(10, 'railway=platform', [
      [-100, 5],
      [100, 5],
    ]);
    f.square(11, 'building=roof', 0, 8, 6);
    f.square(12, 'building=train_station', 0, 40, 20);
    // Untagged building holding the point, a roof far from the platforms.
    f.square(13, 'building=yes', 0, 0, 10);
    f.square(14, 'building=roof', 0, -60, 6);
    const [zone] = f.zones();
    expect(zone.source).toBe('osm');
    expect(zone.clusters).toHaveLength(1);
    expect(zone.buildings).toHaveLength(2);
  });

  it('takes the platforms of its stop area up to 300 m away', () => {
    const f = stationOnTrack();
    f.way(10, 'railway=platform', [
      [180, 5],
      [260, 5],
    ]);
    const [zone] = f.zones();
    expect(zone.source).toBe('rails');
    f.relations.push(
      `r2 Ttype=public_transport,public_transport=stop_area Mn1000@,w10@`,
    );
    expect(f.zones()[0].source).toBe('osm');
  });

  it('keeps the point of a station far from any track', () => {
    const f = new Fixture();
    const station = f.node(0, 0, 'railway=station,name=S');
    const stop = f.node(0, 500, 'railway=stop');
    f.way(1, 'railway=rail', [
      [-500, 500],
      [500, 500],
    ]);
    f.relations.push(
      `r1 Ttype=route,route=train Mn${station}@stop,n${stop}@stop,w1@`,
    );
    const [zone] = f.zones();
    expect(zone.source).toBe('point');
  });
});
