import { parseOplLine } from './osm-opl';
import { RailwayDataBuilder, type RailwayData } from './railway-data';
import { RailwayNetwork, withoutRedundant } from './railway-network';

/** About 786 m of longitude at latitude 45. */
const STEP = 0.01;
const LAT = 45;
/** About 1 m of latitude. */
const M = 1 / 111_320;

interface Fixture {
  nodes: string[];
  ways: string[];
  relations: string[];
}

const empty = (): Fixture => ({ nodes: [], ways: [], relations: [] });

/** A track along the latitude `lat`, nodes `firstId…` every `STEP` from `fromLon`. */
function track(
  f: Fixture,
  wayId: number,
  firstId: number,
  fromLon: number,
  count: number,
  tags: string,
  lat = LAT,
): number[] {
  const ids: number[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(firstId + i);
    f.nodes.push(`n${firstId + i} T x${fromLon + i * STEP} y${lat}`);
  }
  f.ways.push(`w${wayId} T${tags} N${ids.map((id) => `n${id}`).join(',')}`);
  return ids;
}

function station(
  f: Fixture,
  id: number,
  lon: number,
  lat: number,
  tags = '',
): void {
  f.nodes.push(`n${id} Trailway=station,name=S${id}${tags} x${lon} y${lat}`);
}

/** A passenger train route serving the stations. */
function route(
  f: Fixture,
  id: number,
  stations: number[],
  ways: number[],
): void {
  const members = [
    ...stations.map((s) => `n${s}@stop`),
    ...ways.map((w) => `w${w}@`),
  ];
  f.relations.push(`r${id} Ttype=route,route=train M${members.join(',')}`);
}

function dataOf(f: Fixture): RailwayData {
  const builder = new RailwayDataBuilder();
  const byId = (line: string) => Number(line.split(' ')[0].slice(1));
  for (const line of [
    ...[...f.nodes].sort((a, b) => byId(a) - byId(b)),
    ...[...f.ways].sort((a, b) => byId(a) - byId(b)),
    ...[...f.relations].sort((a, b) => byId(a) - byId(b)),
  ]) {
    builder.add(parseOplLine(line)!);
  }
  return builder.finish();
}

/** Links as `osmId-osmId`, sorted. */
function linksOf(data: RailwayData): string[] {
  const { links } = new RailwayNetwork(data).linkAll();
  return links
    .map(({ a, b }) =>
      [data.stations[a].osmId, data.stations[b].osmId]
        .sort((p, q) => p - q)
        .join('-'),
    )
    .sort();
}

describe('RailwayNetwork', () => {
  it('links each station to the next ones only, never across a station', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail,usage=main');
    station(f, 101, 0.005, LAT + 20 * M);
    station(f, 102, 0.035, LAT - 15 * M);
    station(f, 103, 0.075, LAT);
    route(f, 1, [101, 102, 103], [1]);

    expect(linksOf(dataOf(f))).toEqual(['101-102', '102-103']);
  });

  it('measures a link along the tracks, from one station to the other', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail');
    station(f, 101, 0.005, LAT);
    station(f, 102, 0.035, LAT);
    route(f, 1, [101, 102], [1]);

    const [link] = new RailwayNetwork(dataOf(f)).linkAll().links;

    expect(link.lengthM).toBeCloseTo(
      0.03 * 111_320 * Math.cos((45 * Math.PI) / 180),
      0,
    );
    expect(link.coords[0]).toEqual([0.005, LAT]);
    expect(link.coords.at(-1)).toEqual([0.035, LAT]);
  });

  it('keeps only the stations served by a passenger train route', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail');
    // A park train, on a tourist line no route serves.
    track(f, 2, 51, 0, 5, 'railway=narrow_gauge,usage=tourism', LAT + 0.02);
    station(f, 101, 0.005, LAT);
    station(f, 102, 0.015, LAT + 0.02);
    station(f, 103, 0.075, LAT);
    station(f, 104, 0.06, LAT, ',station=subway,subway=yes');
    route(f, 1, [101, 103], [1]);
    const data = dataOf(f);

    expect(
      data.stations.map((s) => [s.osmId, s.exclusion, s.servedBy]),
    ).toEqual([
      [101, null, 'route'],
      [102, 'not_served', null],
      [103, null, 'route'],
      [104, 'not_train', null],
    ]);
    expect(linksOf(data)).toEqual(['101-103']);
  });

  it('keeps a station beside a passenger track where no route is mapped', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail,usage=main');
    track(f, 2, 51, 0, 5, 'railway=preserved', LAT + 0.02);
    station(f, 101, 0.005, LAT + 100 * M);
    station(f, 102, 0.035, LAT);
    // Too far from the track.
    station(f, 103, 0.075, LAT + 300 * M);
    // Beside a heritage line: only a route would show it is served.
    station(f, 104, 0.015, LAT + 0.02);
    const data = dataOf(f);

    expect(
      data.stations.map((s) => [s.osmId, s.exclusion, s.servedBy]),
    ).toEqual([
      [101, null, 'track'],
      [102, null, 'track'],
      [103, 'not_served', null],
      [104, 'not_served', null],
    ]);
    expect(linksOf(data)).toEqual(['101-102']);
  });

  it('counts a station near a stop of a route as served', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail');
    station(f, 101, 0.005, LAT + 100 * M);
    station(f, 102, 0.035, LAT);
    f.nodes.push(
      `n201 Tpublic_transport=stop_position,train=yes x0.005 y${LAT}`,
    );
    f.relations.push(`r1 Ttype=route,route=train Mn201@stop,n102@stop,w1@`);

    expect(linksOf(dataOf(f))).toEqual(['101-102']);
  });

  it('counts the stations of a stop area with a stop of a route as served', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail');
    station(f, 101, 0.005, LAT + 350 * M);
    station(f, 102, 0.035, LAT);
    f.nodes.push(`n201 Tpublic_transport=stop_position x0.005 y${LAT}`);
    f.relations.push(`r1 Ttype=route,route=train Mn201@stop,n102@stop,w1@`);
    f.relations.push(
      `r2 Ttype=public_transport,public_transport=stop_area Mn101@,n201@stop`,
    );

    expect(dataOf(f).stations.map((s) => s.exclusion)).toEqual([null, null]);
  });

  it('never walks a freight line, a siding or a yard', () => {
    const f = empty();
    // Two passenger branches joined only by a freight line.
    track(f, 1, 1, 0, 3, 'railway=rail');
    track(f, 2, 11, 0.02, 4, 'railway=rail,railway:traffic_mode=freight');
    track(f, 3, 21, 0.05, 3, 'railway=rail');
    f.ways.push('w4 Trailway=rail,service=siding Nn1,n23');
    f.nodes.splice(f.nodes.indexOf(`n11 T x0.02 y${LAT}`), 1);
    f.nodes.splice(f.nodes.indexOf(`n14 T x0.05 y${LAT}`), 1);
    f.ways[1] = 'w2 Trailway=rail,railway:traffic_mode=freight Nn3,n12,n13,n21';
    station(f, 101, 0.0, LAT);
    station(f, 102, 0.07, LAT);
    route(f, 1, [101], [1]);
    route(f, 2, [102], [3]);

    expect(linksOf(dataOf(f))).toEqual([]);
  });

  it('walks a freight-tagged track of a passenger train route', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail,railway:traffic_mode=freight');
    station(f, 101, 0.005, LAT);
    station(f, 102, 0.035, LAT);
    route(f, 1, [101, 102], [1]);

    expect(linksOf(dataOf(f))).toEqual(['101-102']);
  });

  it('stops at a station beside a bypass without linking it', () => {
    const f = empty();
    // The line through the station of the town, and a bypass 100 m away.
    const main = track(f, 1, 1, 0, 9, 'railway=rail');
    const bypass = track(f, 2, 21, 0.02, 5, 'railway=rail', LAT + 100 * M);
    f.ways.push(`w3 Trailway=rail Nn${main[1]},n${bypass[0]}`);
    f.ways.push(`w4 Trailway=rail Nn${bypass[4]},n${main[7]}`);
    station(f, 101, 0.0, LAT);
    station(f, 102, 0.04, LAT);
    station(f, 103, 0.08, LAT);
    route(f, 1, [101, 102, 103], [1]);

    expect(linksOf(dataOf(f))).toEqual(['101-102', '102-103']);
  });

  it('rejects a link far longer than the straight distance', () => {
    const f = empty();
    // A loop of about 20 km between two stations 1.5 km apart.
    const out = track(f, 1, 1, 0, 2, 'railway=rail');
    const loop: string[] = [];
    for (let i = 0; i < 13; i++) {
      f.nodes.push(`n${100 + i} T x${0.01 + i * 0.01} y${LAT + 0.05}`);
      loop.push(`n${100 + i}`);
    }
    f.ways.push(`w2 Trailway=rail Nn${out[1]},${loop.join(',')}`);
    f.nodes.push(`n200 T x0.02 y${LAT}`);
    f.ways.push(`w3 Trailway=rail Nn112,n200`);
    station(f, 301, 0.0, LAT);
    station(f, 302, 0.02, LAT);
    route(f, 1, [301, 302], [1, 2, 3]);

    const network = new RailwayNetwork(dataOf(f));
    const result = network.linkAll();

    expect(result.links).toEqual([]);
    expect(result.detours).toHaveLength(1);
  });

  it('reports the kept stations far from any passenger track', () => {
    const f = empty();
    track(f, 1, 1, 0, 3, 'railway=rail');
    station(f, 101, 0.0, LAT + 1000 * M);
    route(f, 1, [101], [1]);
    const data = dataOf(f);

    expect(
      new RailwayNetwork(data)
        .linkAll()
        .isolated.map((i) => data.stations[i].osmId),
    ).toEqual([101]);
  });
});

describe('withoutRedundant', () => {
  const link = (a: number, b: number, km: number) => ({
    a,
    b,
    lengthM: km * 1000,
    coords: [],
  });

  it('drops a link along two shorter links through a third station', () => {
    // Stations 0 and 1 near the start of a line without stops to station 2.
    const { links, redundant } = withoutRedundant([
      link(0, 1, 5),
      link(0, 2, 300),
      link(1, 2, 296),
    ]);

    expect(links.map(({ a, b }) => `${a}-${b}`)).toEqual(['1-2', '0-1']);
    expect(redundant).toEqual([{ a: 0, b: 2, lengthM: 300_000, via: 1 }]);
  });

  it('keeps a link far shorter than any path through another station', () => {
    const { links } = withoutRedundant([
      link(0, 1, 10),
      link(1, 2, 10),
      link(0, 2, 15),
    ]);

    expect(links).toHaveLength(3);
  });

  it('never drops both links of two stations close to each other', () => {
    // 1 and 2 are 200 m apart, each 100 km from 0.
    const { links } = withoutRedundant([
      link(0, 1, 100),
      link(0, 2, 100.1),
      link(1, 2, 0.2),
    ]);

    expect(links.map(({ a, b }) => `${a}-${b}`)).toEqual(['0-1', '1-2']);
  });
});
