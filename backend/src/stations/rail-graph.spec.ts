import type { OsmRailWay } from './overpass/overpass-queries';
import { RailGraph, regionBbox, regionOf } from './rail-graph';

/** About 786 m of longitude at latitude 45. */
const STEP = 0.01;
const LAT = 45;
/** About 11 m of latitude. */
const METER_LAT = 1 / 111_320;

let nextNode = 1;

/** A straight way along the latitude `lat`, from `fromLon`, with `count` nodes `STEP` apart. */
function line(
  id: number,
  fromLon: number,
  count: number,
  lat = LAT,
): OsmRailWay {
  const nodes: number[] = [];
  const coords: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    nodes.push(nextNode++);
    coords.push([fromLon + i * STEP, lat]);
  }
  return { id, nodes, coords };
}

function graphOf(ways: OsmRailWay[], loaded = true): RailGraph {
  const graph = new RailGraph();
  graph.addWays(ways);
  if (loaded) {
    for (const way of ways) {
      for (const [lon, lat] of way.coords) {
        graph.markLoaded(regionOf(lon, lat));
      }
    }
  }
  return graph;
}

function neighbors(graph: RailGraph, station: number): number[] {
  return graph
    .walk(station)
    .links.map((link) => link.to)
    .sort((a, b) => a - b);
}

describe('RailGraph', () => {
  it('links each station to the next ones only, never across a station', () => {
    const graph = graphOf([line(1, 0, 10)]);
    // Beside the track, between its nodes.
    graph.addStation({ id: 1, lon: 0.005, lat: LAT + 20 * METER_LAT });
    graph.addStation({ id: 2, lon: 0.035, lat: LAT - 15 * METER_LAT });
    graph.addStation({ id: 3, lon: 0.075, lat: LAT });

    expect(neighbors(graph, 1)).toEqual([2]);
    expect(neighbors(graph, 2)).toEqual([1, 3]);
    expect(neighbors(graph, 3)).toEqual([2]);
  });

  it('measures the link along the tracks, from one snap point to the other', () => {
    const graph = graphOf([line(1, 0, 10)]);
    graph.addStation({ id: 1, lon: 0.005, lat: LAT });
    graph.addStation({ id: 2, lon: 0.035, lat: LAT });

    const [link] = graph.walk(1).links;

    expect(link.lengthM).toBeCloseTo(2358.8, 0);
    expect(link.coords[0]).toEqual([0.005, LAT]);
    expect(link.coords.at(-1)).toEqual([0.035, LAT]);
    expect(link.coords).toHaveLength(5);
  });

  it('links two stations on the same edge', () => {
    const graph = graphOf([line(1, 0, 2)]);
    graph.addStation({ id: 1, lon: 0.002, lat: LAT });
    graph.addStation({ id: 2, lon: 0.008, lat: LAT });

    const [link] = graph.walk(1).links;

    expect(link.to).toBe(2);
    expect(link.coords).toEqual([
      [0.002, LAT],
      [0.008, LAT],
    ]);
  });

  it('follows a junction to both branches', () => {
    const stem = line(1, 0, 4);
    const north: OsmRailWay = {
      id: 2,
      nodes: [stem.nodes[3], nextNode++, nextNode++],
      coords: [stem.coords[3], [0.04, LAT + 0.01], [0.05, LAT + 0.02]],
    };
    const south: OsmRailWay = {
      id: 3,
      nodes: [stem.nodes[3], nextNode++, nextNode++],
      coords: [stem.coords[3], [0.04, LAT - 0.01], [0.05, LAT - 0.02]],
    };
    const graph = graphOf([stem, north, south]);
    graph.addStation({ id: 1, lon: 0, lat: LAT });
    graph.addStation({ id: 2, lon: 0.05, lat: LAT + 0.02 });
    graph.addStation({ id: 3, lon: 0.05, lat: LAT - 0.02 });

    expect(neighbors(graph, 1)).toEqual([2, 3]);
    expect(neighbors(graph, 2)).toEqual([1, 3]);
  });

  it('finds a neighbor once on a double track linked by crossovers', () => {
    const up = line(1, 0, 5);
    const down = line(2, 0, 5, LAT + 10 * METER_LAT);
    const crossover: OsmRailWay = {
      id: 3,
      nodes: [up.nodes[2], down.nodes[3]],
      coords: [up.coords[2], down.coords[3]],
    };
    const graph = graphOf([up, down, crossover]);
    graph.addStation({ id: 1, lon: 0.005, lat: LAT + 5 * METER_LAT });
    graph.addStation({ id: 2, lon: 0.035, lat: LAT + 5 * METER_LAT });

    expect(neighbors(graph, 1)).toEqual([2]);
    // A station between the tracks stands on both: the walk cannot pass it on either.
    graph.addStation({ id: 3, lon: 0.015, lat: LAT + 5 * METER_LAT });
    expect(neighbors(graph, 1)).toEqual([3]);
  });

  it('does not snap a station to a line passing farther than its own', () => {
    const own = line(1, 0, 5);
    const other = line(2, 0, 5, LAT + 200 * METER_LAT);
    const graph = graphOf([own, other]);
    graph.addStation({ id: 1, lon: 0.015, lat: LAT + 10 * METER_LAT });
    graph.addStation({ id: 2, lon: 0.035, lat: LAT + 200 * METER_LAT });

    expect(neighbors(graph, 1)).toEqual([]);
  });

  it('links no station farther than the snapping distance from the tracks', () => {
    const graph = graphOf([line(1, 0, 5)]);
    graph.addStation({ id: 1, lon: 0.015, lat: LAT + 500 * METER_LAT });
    graph.addStation({ id: 2, lon: 0.035, lat: LAT });

    expect(neighbors(graph, 1)).toEqual([]);
    expect(neighbors(graph, 2)).toEqual([]);
  });

  it('stops at a station snapped to a node', () => {
    const way = line(1, 0, 5);
    const graph = graphOf([way]);
    graph.addStation({ id: 1, lon: 0, lat: LAT });
    graph.addStation({ id: 2, lon: 0.02, lat: LAT });
    graph.addStation({ id: 3, lon: 0.04, lat: LAT });

    expect(neighbors(graph, 1)).toEqual([2]);
  });

  it('reports the regions not loaded instead of partial links', () => {
    // From the middle of a region to beyond its eastern edge.
    const region = regionOf(0.5, 44.9);
    const [, , , east] = regionBbox(region);
    const way = line(1, east - 0.03, 6, 44.9);
    const graph = graphOf([way], false);
    graph.markLoaded(region);
    graph.addStation({ id: 1, lon: east - 0.025, lat: 44.9 });
    graph.addStation({ id: 2, lon: east + 0.015, lat: 44.9 });

    const result = graph.walk(1);

    expect(result.links).toEqual([]);
    expect(result.missing).toEqual([regionOf(east + 0.005, 44.9)]);
  });

  it('links no station at the same point, and walks past neither', () => {
    const graph = graphOf([line(1, 0, 5)]);
    graph.addStation({ id: 1, lon: 0.02, lat: LAT });
    graph.addStation({ id: 2, lon: 0.02, lat: LAT });
    graph.addStation({ id: 3, lon: 0.04, lat: LAT });

    expect(neighbors(graph, 1)).toEqual([3]);
    expect(neighbors(graph, 3)).toEqual([1, 2]);
  });

  it('gives up beyond the walking distance', () => {
    const graph = graphOf([line(1, 0, 10)]);
    graph.addStation({ id: 1, lon: 0, lat: LAT });
    graph.addStation({ id: 2, lon: 0.09, lat: LAT });

    expect(graph.walk(1, 5_000).links).toEqual([]);
    expect(graph.walk(1, 10_000).links.map((link) => link.to)).toEqual([2]);
  });
});

describe('regionBbox', () => {
  it('contains the points of its region, with the buffer around', () => {
    const region = regionOf(2.35, 48.85);
    const [south, west, north, east] = regionBbox(region);
    const [bSouth, bWest, bNorth, bEast] = regionBbox(region, 1_000);

    expect(south).toBeLessThan(48.85);
    expect(north).toBeGreaterThan(48.85);
    expect(west).toBeLessThan(2.35);
    expect(east).toBeGreaterThan(2.35);
    expect(south - bSouth).toBeCloseTo(0.009, 3);
    expect(bNorth - north).toBeCloseTo(0.009, 3);
    expect(west - bWest).toBeGreaterThan(0.009);
    expect(bEast - east).toBeGreaterThan(0.009);
  });
});
