import { footprintMerges, type FootprintStation } from './station-merges';

const stations = new Map<number, FootprintStation>(
  [
    { id: 1, name: 'München Hauptbahnhof', areaM2: 99_601, routes: 2 },
    { id: 2, name: 'Hauptbahnhof (tief)', areaM2: 56_878, routes: 2 },
    { id: 3, name: 'München Hbf Gleis 27-36, Starnberger Bahnhof', areaM2: 72_786, routes: 2 },
    { id: 4, name: 'Gare Montparnasse', areaM2: 122_322, routes: 2 },
    { id: 5, name: 'Paris Montparnasse 3 - Vaugirard', areaM2: 85_108, routes: 2 },
    { id: 6, name: 'Paris Gare du Nord', areaM2: 90_000, routes: 2 },
    { id: 7, name: 'Magenta', areaM2: 40_000, routes: 2 },
    { id: 8, name: null, areaM2: 1_000, routes: 2 },
    { id: 9, name: 'Youb', areaM2: 2_000, routes: 2 },
    { id: 10, name: 'محطة القطار يوب', areaM2: 3_000, routes: 2 },
  ].map((station) => [station.id, station]),
);

describe('footprintMerges', () => {
  it('merges each group of overlapping stations into its largest footprint', () => {
    const merges = footprintMerges(
      [
        { a: 2, b: 3, share: 0.7 },
        { a: 1, b: 2, share: 0.7 },
        { a: 1, b: 3, share: 0.7 },
        { a: 4, b: 5, share: 0.7 },
      ],
      stations,
    );

    expect([...merges].sort(([a], [b]) => a - b)).toEqual([
      [2, 1],
      [3, 1],
      [5, 4],
    ]);
  });

  it('keeps apart overlapping stations without a name in common', () => {
    const merges = footprintMerges(
      [
        { a: 6, b: 7, share: 0.7 },
        { a: 6, b: 8, share: 0.7 },
      ],
      stations,
    );

    expect([...merges]).toEqual([[8, 6]]);
  });

  it('merges a footprint within another whatever their names', () => {
    expect([
      ...footprintMerges([{ a: 9, b: 10, share: 1 }], stations),
    ]).toEqual([[9, 10]]);
  });

  it('keeps the station served by the most train routes', () => {
    const own = new Map<number, FootprintStation>([
      [1, { id: 1, name: 'Meroux', areaM2: 50_000, routes: 2 }],
      [2, { id: 2, name: 'Belfort-Montbéliard TGV', areaM2: 30_000, routes: 12 }],
      [3, { id: 3, name: 'Meroux Halte', areaM2: 90_000, routes: 0 }],
    ]);

    expect([
      ...footprintMerges(
        [
          { a: 1, b: 2, share: 1 },
          { a: 1, b: 3, share: 1 },
        ],
        own,
      ),
    ].sort(([a], [b]) => a - b)).toEqual([
      [1, 2],
      [3, 2],
    ]);
  });

  it('merges nothing without an overlap', () => {
    expect(footprintMerges([], stations).size).toBe(0);
  });
});
