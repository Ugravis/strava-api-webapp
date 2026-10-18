import {
  parseRailways,
  parseStations,
  railwaysQuery,
  stationsQuery,
} from './overpass-queries';

describe('stationsQuery', () => {
  it('asks for the train stations of an area as tab-separated values', () => {
    const query = stationsQuery([-90, -180, 90, -135]);

    expect(query).toContain('[out:csv(::id,::lat,::lon,name;false)]');
    expect(query).toContain('node[railway~"^(station|halt)$"]');
    expect(query).toContain(
      '[station!~"^(subway|light_rail|monorail|funicular|tram|miniature)$"]',
    );
    expect(query).toContain('(-90.000000,-180.000000,90.000000,-135.000000)');
  });
});

describe('railwaysQuery', () => {
  it('asks for the tracks without their tags, nor the yards and sidings', () => {
    const query = railwaysQuery([48.5, 2.6, 48.58, 2.72]);

    expect(query).toContain('[service!~"^(yard|siding|spur)$"]');
    expect(query).toContain('[usage!~"^(industrial|military|test)$"]');
    expect(query).toMatch(/out skel geom;$/);
  });
});

describe('parseStations', () => {
  it('reads the id, position and name of each line, skipping malformed ones', () => {
    const csv = [
      '248812250\t48.5274833\t2.6551924\tMelun',
      '14296037913\t36.3540274\t139.1397084\t駒形',
      '105105\t52.0532089\t-0.0269749\t',
      'oops\t\t\t',
      '',
    ].join('\n');

    expect(parseStations(csv)).toEqual([
      { id: 248812250, lat: 48.5274833, lon: 2.6551924, name: 'Melun' },
      { id: 14296037913, lat: 36.3540274, lon: 139.1397084, name: '駒形' },
      { id: 105105, lat: 52.0532089, lon: -0.0269749, name: null },
    ]);
  });
});

describe('parseRailways', () => {
  it('reads the nodes and positions of each way, and the date of the data', () => {
    const json = JSON.stringify({
      osm3s: { timestamp_osm_base: '2026-10-18T11:21:56Z' },
      elements: [
        {
          type: 'way',
          id: 6238794,
          nodes: [1, 2, 3],
          geometry: [
            { lat: 48.52758, lon: 2.6462313 },
            null,
            { lat: 48.5277972, lon: 2.646839 },
          ],
        },
        { type: 'way', id: 7, nodes: [4], geometry: [{ lat: 1, lon: 1 }] },
      ],
    });

    expect(parseRailways(json)).toEqual({
      ways: [
        {
          id: 6238794,
          nodes: [1, 3],
          coords: [
            [2.6462313, 48.52758],
            [2.646839, 48.5277972],
          ],
        },
      ],
      osmTimestamp: new Date('2026-10-18T11:21:56Z'),
    });
  });

  it('fails on a query stopped by the server', () => {
    const json = JSON.stringify({
      remark:
        'runtime error: Query timed out in "query" at line 1 after 301 seconds.',
      elements: [],
    });

    expect(() => parseRailways(json)).toThrow('Query timed out');
  });
});
