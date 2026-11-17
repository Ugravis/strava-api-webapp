import type { StationCandidate } from './railway-data';
import type { NetworkLink } from './railway-network';
import { pruneStations } from './station-pruning';

/** About 786 m of longitude at latitude 45. */
const STEP = 0.01;

function station(lon: number, tourist: boolean): StationCandidate {
  return {
    osmType: 'n',
    osmId: Math.round(lon * 1000),
    name: null,
    point: [lon, 45],
    exclusion: null,
    servedBy: 'route',
    routeIds: [],
    tourist,
    tags: {},
    mergedInto: null,
  };
}

const link = (a: number, b: number, lengthM = 800): NetworkLink => ({
  a,
  b,
  lengthM,
  coords: [],
});

describe('pruneStations', () => {
  it('drops a small tourist network, its stations and links', () => {
    // A park train: three tourist stations within 1.6 km.
    const stations = [0, 1, 2].map((i) => station(i * STEP, true));

    expect(pruneStations(stations, [link(0, 1), link(1, 2)])).toEqual([]);
    expect(stations.map((s) => s.exclusion)).toEqual(['park', 'park', 'park']);
  });

  it('keeps a tourist line going from A to B', () => {
    // A heritage line 7 km long.
    const stations = [0, 9].map((i) => station(i * STEP, true));

    expect(pruneStations(stations, [link(0, 1, 7_000)])).toHaveLength(1);
    expect(stations.map((s) => s.exclusion)).toEqual([null, null]);
  });

  it('keeps a tourist shuttle running far between its stops', () => {
    // An island railway, from the harbour to the village 2.4 km away.
    const stations = [0, 3].map((i) => station(i * STEP, true));

    expect(pruneStations(stations, [link(0, 1, 2_400)])).toHaveLength(1);
  });

  it('keeps a small network with a station of the real trains', () => {
    const stations = [station(0, true), station(STEP, false)];

    expect(pruneStations(stations, [link(0, 1)])).toHaveLength(1);
  });

  it('drops the stations linked to no other one', () => {
    const stations = [0, 1, 5].map((i) => station(i * STEP, false));

    pruneStations(stations, [link(0, 1)]);

    expect(stations.map((s) => s.exclusion)).toEqual([null, null, 'unlinked']);
  });
});
