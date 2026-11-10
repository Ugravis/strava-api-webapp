import { footprintMerges, type FootprintStation } from './station-merges';

const stations = new Map<number, FootprintStation>(
  [
    { id: 1, name: 'München Hauptbahnhof', areaM2: 99_601 },
    { id: 2, name: 'Hauptbahnhof (tief)', areaM2: 56_878 },
    { id: 3, name: 'München Hbf Gleis 27-36, Starnberger Bahnhof', areaM2: 72_786 },
    { id: 4, name: 'Gare Montparnasse', areaM2: 122_322 },
    { id: 5, name: 'Paris Montparnasse 3 - Vaugirard', areaM2: 85_108 },
  ].map((station) => [station.id, station]),
);

describe('footprintMerges', () => {
  it('merges each group of overlapping stations into its largest footprint', () => {
    const merges = footprintMerges(
      [
        { a: 2, b: 3 },
        { a: 1, b: 3 },
        { a: 4, b: 5 },
      ],
      stations,
    );

    expect([...merges].sort(([a], [b]) => a - b)).toEqual([
      [2, 1],
      [3, 1],
      [5, 4],
    ]);
  });

  it('merges nothing without an overlap', () => {
    expect(footprintMerges([], stations).size).toBe(0);
  });
});
