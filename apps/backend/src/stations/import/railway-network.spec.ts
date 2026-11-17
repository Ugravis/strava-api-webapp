import { parseOplLine } from './osm-opl';
import {
  levelNamesMatch,
  namesMatch,
  normalizedName,
  RailwayDataBuilder,
  type RailwayData,
} from './railway-data';
import {
  RailwayNetwork,
  reachingStations,
  withoutRedundant,
} from './railway-network';

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

/** A station mapped as its building only: a 40 m square way `wayId` centered on the point. */
function building(f: Fixture, wayId: number, lon: number, lat: number): void {
  const dLon = 20 / (111_320 * Math.cos((lat * Math.PI) / 180));
  const dLat = 20 * M;
  const corners = [
    [-dLon, -dLat],
    [dLon, -dLat],
    [dLon, dLat],
    [-dLon, dLat],
  ];
  const ids = corners.map((_, i) => 900 + wayId * 10 + i);
  corners.forEach(([x, y], i) =>
    f.nodes.push(`n${ids[i]} T x${lon + x} y${lat + y}`),
  );
  f.ways.push(
    `w${wayId} Tbuilding=train_station,railway=station,name=S${wayId} N${[...ids, ids[0]].map((id) => `n${id}`).join(',')}`,
  );
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

  it('draws a link along the tracks only, from where its stations stand on them', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail');
    station(f, 101, 0.005, LAT + 100 * M);
    station(f, 102, 0.035, LAT);
    route(f, 1, [101, 102], [1]);

    const [link] = new RailwayNetwork(dataOf(f)).linkAll().links;

    expect(link.coords[0][0]).toBeCloseTo(0.005, 6);
    expect(link.coords.at(-1)).toEqual([0.035, LAT]);
    for (const [, lat] of link.coords) expect(lat).toBeCloseTo(LAT, 9);
    // Measured along the tracks only.
    expect(link.lengthM).toBeCloseTo(
      0.03 * 111_320 * Math.cos((45 * Math.PI) / 180),
      0,
    );
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

  it('keeps a station mapped as its building only, at its center', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail');
    station(f, 101, 0.005, LAT);
    building(f, 9, 0.035, LAT + 50 * M);
    f.nodes.push(`n201 Tpublic_transport=stop_position x0.035 y${LAT}`);
    f.relations.push(`r1 Ttype=route,route=train Mn101@stop,n201@stop,w1@`);
    f.relations.push(
      `r2 Ttype=public_transport,public_transport=stop_area Mw9@,n201@stop`,
    );
    const data = dataOf(f);

    expect(
      data.stations.map((s) => [s.osmType, s.osmId, s.exclusion, s.servedBy]),
    ).toEqual([
      ['n', 101, null, 'route'],
      ['w', 9, null, 'route'],
    ]);
    expect(data.stations[1].point[0]).toBeCloseTo(0.035, 6);
    expect(data.stations[1].point[1]).toBeCloseTo(LAT + 50 * M, 6);
    // Its building outlines it, though no station node was near when read.
    expect(data.features.features.map((feature) => feature.key)).toContain(
      'w9',
    );
    expect(linksOf(data)).toEqual(['9-101']);
  });

  it('ignores the building of a station mapped as a node', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail');
    station(f, 101, 0.005, LAT);
    station(f, 102, 0.035, LAT);
    building(f, 9, 0.036, LAT + 150 * M);
    route(f, 1, [101, 102], [1]);

    expect(dataOf(f).stations.map((s) => `${s.osmType}${s.osmId}`)).toEqual([
      'n101',
      'n102',
    ]);
  });

  it('never stops a walk at its own station, beside its other tracks', () => {
    const f = empty();
    // The line leaves the station westward, turns and passes it again
    // 100 m away, beyond the tracks it stands on, toward 102.
    const west = track(f, 1, 1, 0, 3, 'railway=rail');
    const east = track(f, 2, 11, 0.01, 8, 'railway=rail', LAT + 100 * M);
    f.ways.push(`w3 Trailway=rail Nn${west[0]},n${east[0]}`);
    station(f, 101, 0.02, LAT);
    station(f, 102, 0.07, LAT + 100 * M);
    route(f, 1, [101, 102], [1, 2, 3]);

    expect(linksOf(dataOf(f))).toEqual(['101-102']);
  });

  it('excludes a metro station tagged train=yes unless a train route serves it', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail');
    station(f, 101, 0.005, LAT, ',station=subway,subway=yes,train=yes');
    station(f, 102, 0.035, LAT, ',station=subway,subway=yes,train=yes');
    station(f, 103, 0.075, LAT);
    route(f, 1, [102, 103], [1]);

    expect(dataOf(f).stations.map((s) => s.exclusion)).toEqual([
      'not_train',
      null,
      null,
    ]);
  });

  it('never counts the train ride of an amusement park as a train route', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=narrow_gauge,usage=tourism');
    station(f, 101, 0.005, LAT, ',tourism=attraction');
    station(f, 102, 0.035, LAT, ',tourism=attraction');
    route(f, 1, [101, 102], [1]);
    f.relations[0] = f.relations[0].replace(
      'route=train',
      'route=train,attraction=train',
    );

    expect(dataOf(f).stations.map((s) => s.exclusion)).toEqual([
      'not_served',
      'not_served',
    ]);
  });

  it('never counts a park station beside the stop of a real train as served', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail');
    track(
      f,
      2,
      20,
      0.005,
      2,
      'railway=narrow_gauge,usage=tourism',
      LAT + 100 * M,
    );
    station(f, 101, 0.005, LAT + 100 * M);
    station(f, 102, 0.035, LAT);
    station(f, 103, 0.075, LAT);
    // A heritage station beside the stop is still served by it.
    station(f, 104, 0.0052, LAT + 50 * M, ',tourism=attraction');
    f.nodes.push(
      `n201 Tpublic_transport=stop_position,train=yes x0.005 y${LAT}`,
    );
    f.relations.push(
      `r1 Ttype=route,route=train Mn201@stop,n102@stop,n103@stop,w1@`,
    );
    f.relations.push(
      `r2 Ttype=route,route=train,attraction=train Mn101@stop,w2@`,
    );

    expect(dataOf(f).stations.map((s) => s.exclusion)).toEqual([
      'not_served',
      null,
      null,
      null,
    ]);
  });

  it('merges a station mapped twice into the one served by a route', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail');
    f.nodes.push(
      `n101 Trailway=station,name=Gare%20%Lille%20%Europe x0.035 y${LAT + 100 * M}`,
    );
    f.nodes.push(`n102 Trailway=station,name=Lille-Europe x0.035 y${LAT}`);
    // Two stations 86 m apart, one name holding the other with a real word.
    f.nodes.push(
      `n103 Trailway=station,name=Catford%20%Bridge x0.034 y${LAT - 150 * M}`,
    );
    f.nodes.push(`n104 Trailway=station,name=Catford x0.035 y${LAT - 150 * M}`);
    // A third, without a name, in the stop area of 102.
    f.nodes.push(`n105 Trailway=halt x0.036 y${LAT}`);
    f.relations.push(
      `r2 Ttype=public_transport,public_transport=stop_area Mn102@,n105@`,
    );
    route(f, 1, [102], [1]);
    const data = dataOf(f);
    const indexOf = (id: number) =>
      data.stations.findIndex((s) => s.osmId === id);

    expect(
      data.stations.map((s) => [s.osmId, s.exclusion, s.mergedInto]),
    ).toEqual([
      [101, 'merged', indexOf(102)],
      [102, null, null],
      [103, null, null],
      [104, null, null],
      [105, 'merged', indexOf(102)],
    ]);
  });

  it('links a merged station along the tracks of each of its points', () => {
    const f = empty();
    // Two lines ending 150 m apart, each at its own node of the station.
    track(f, 1, 1, 0, 4, 'railway=rail');
    track(f, 2, 11, 0.03, 6, 'railway=rail', LAT + 150 * M);
    f.nodes.push(`n101 Trailway=station,name=Troyes x0.03 y${LAT}`);
    f.nodes.push(
      `n102 Trailway=station,name=Gare%20%de%20%Troyes x0.03 y${LAT + 150 * M}`,
    );
    station(f, 103, 0.005, LAT);
    station(f, 104, 0.07, LAT + 150 * M);
    route(f, 1, [101, 103], [1]);
    route(f, 2, [102, 104], [2]);

    expect(linksOf(dataOf(f))).toEqual(['101-103', '101-104']);
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

  it('never cuts a line at the switch of a track ending beside a station', () => {
    const f = empty();
    const main = track(f, 1, 1, 0, 10, 'railway=rail');
    // Tracks leaving the line 100 m from stations 101 and 102, away from
    // them: their nearest point to the station is their switch, on the line.
    f.nodes.push(`n51 T x0.012 y${LAT + 0.003}`);
    f.nodes.push(`n52 T x0.028 y${LAT + 0.003}`);
    f.ways.push(`w2 Trailway=rail Nn${main[1]},n51`);
    f.ways.push(`w3 Trailway=rail Nn${main[3]},n52`);
    station(f, 101, 0.00873, LAT);
    station(f, 102, 0.03127, LAT);
    station(f, 103, 0.075, LAT);
    route(f, 1, [101, 102, 103], [1]);

    expect(linksOf(dataOf(f))).toEqual(['101-102', '102-103']);
  });

  it('walks a metro-tagged track only where a train route runs on it', () => {
    const f = empty();
    // A suburban line in a tunnel mapped as a metro, and a real metro line.
    track(f, 1, 1, 0, 10, 'railway=subway');
    track(f, 2, 21, 0, 10, 'railway=subway', LAT + 0.02);
    station(f, 101, 0.005, LAT, ',station=subway,subway=yes,train=yes');
    station(f, 102, 0.035, LAT, ',station=subway,subway=yes,train=yes');
    station(f, 103, 0.005, LAT + 0.02, ',train=yes');
    station(f, 104, 0.035, LAT + 0.02, ',train=yes');
    route(f, 1, [101, 102], [1]);

    expect(linksOf(dataOf(f))).toEqual(['101-102']);
  });

  it('passes the station of another line where the routes of its track are mapped', () => {
    const f = empty();
    // Line 1 passes 100 m from station 102 of line 2 without stopping.
    track(f, 1, 1, 0, 10, 'railway=rail');
    track(f, 2, 21, 0.02, 3, 'railway=rail', LAT + 100 * M);
    station(f, 101, 0.005, LAT);
    station(f, 102, 0.03, LAT + 100 * M);
    station(f, 103, 0.075, LAT);
    route(f, 1, [101, 103], [1]);
    route(f, 2, [102], [2]);

    expect(linksOf(dataOf(f))).toContain('101-103');
  });

  it('never serves nor walks the track of an amusement park ride', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=narrow_gauge,gauge=600,attraction=train');
    station(f, 101, 0.005, LAT);
    station(f, 102, 0.035, LAT);

    const data = dataOf(f);
    expect(data.stations.map((s) => s.exclusion)).toEqual([
      'not_served',
      'not_served',
    ]);
  });

  it('tells the tourist stations by their tags, routes or track', () => {
    const f = empty();
    track(f, 1, 1, 0, 10, 'railway=rail');
    track(f, 2, 21, 0, 10, 'railway=narrow_gauge,gauge=600', LAT + 0.02);
    track(f, 3, 41, 0, 10, 'railway=rail', LAT + 0.04);
    station(f, 101, 0.005, LAT);
    station(f, 102, 0.005, LAT + 0.02);
    station(f, 103, 0.005, LAT + 0.04, ',usage=tourism');
    station(f, 104, 0.035, LAT + 0.04);
    route(f, 1, [101], [1]);
    f.relations.push(
      `r2 Ttype=route,route=train,service=tourism Mn104@stop,w3@`,
    );

    expect(dataOf(f).stations.map((s) => s.tourist)).toEqual([
      false,
      true,
      true,
      true,
    ]);
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

describe('namesMatch', () => {
  const match = (a: string, b: string) =>
    namesMatch(normalizedName(a), normalizedName(b));

  it('matches the same station named twice', () => {
    expect(match('Lille-Europe', 'Gare Lille Europe')).toBe(true);
    expect(match('Gare de Lyon', 'Gare de Lyon (RER)')).toBe(true);
    expect(match('Brienz', 'Brienz BRB')).toBe(true);
    expect(match('Venthône', 'Venthone')).toBe(true);
    expect(match('Aéroport CDG 2 TGV', 'Aéroport CDG 2 TGV (RER)')).toBe(true);
  });

  it('tells apart two stations with a real word between them', () => {
    expect(match('Catford', 'Catford Bridge')).toBe(false);
    expect(match('Lille-Europe', 'Lille-Flandres')).toBe(false);
    expect(match('Bourges', 'Saint-Germain-du-Puy')).toBe(false);
  });
});

describe('levelNamesMatch', () => {
  const match = (a: string, b: string) =>
    levelNamesMatch(normalizedName(a), normalizedName(b));

  it('matches a level of a station', () => {
    expect(
      match('Stuttgart Hauptbahnhof', 'Stuttgart Hauptbahnhof (tief)'),
    ).toBe(true);
    expect(match('Leipzig Hbf', 'Leipzig Hbf (Tiefgleise)')).toBe(true);
  });

  it('tells apart two stations of a town', () => {
    expect(match('Varese', 'Varese Nord')).toBe(false);
    expect(match('Essen-Dellwig', 'Essen-Dellwig Ost')).toBe(false);
    expect(match('Jambes', 'Jambes')).toBe(false);
  });
});

describe('reachingStations', () => {
  const a: [number, number] = [0.005, LAT + 100 * M];
  const b: [number, number] = [0.035, LAT];
  const tracks: [number, number][] = [0.005, 0.015, 0.025, 0.035].map((lon) => [
    lon,
    LAT,
  ]);

  it('curves from each station onto the tracks, whichever end comes first', () => {
    for (const coords of [tracks, [...tracks].reverse()]) {
      const path = reachingStations(a, b, coords);

      expect(path[0]).toEqual(a);
      expect(path.at(-1)).toEqual(b);
      // The curve meets the tracks 300 m farther, along them.
      const met = path.slice(12);
      expect(met[0][0]).toBeCloseTo(0.005 + 300 / (111_320 * Math.SQRT1_2), 6);
      for (const [, lat] of met) expect(lat).toBeCloseTo(LAT, 9);
      const lats = path.slice(0, 13).map(([, lat]) => lat);
      expect(lats).toEqual([...lats].sort((p, q) => q - p));
    }
  });
});
