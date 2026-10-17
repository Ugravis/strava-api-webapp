import { toCountryAreas } from './country-areas';

describe('toCountryAreas', () => {
  const wkb = new Uint8Array([1]);

  it('attaches the dependencies to their sovereign country', () => {
    const areas = toCountryAreas(
      [
        { country: 'FR', divisionId: 'france', wkb },
        { country: 'RE', divisionId: 'reunion', wkb },
        { country: 'GL', divisionId: 'greenland', wkb },
      ],
      new Map([
        ['reunion', 'FR'],
        ['greenland', 'DK'],
      ]),
    );

    expect(areas.map((area) => area.code)).toEqual(['FR', 'FR', 'DK']);
  });

  it('keeps the code of an area without sovereign country', () => {
    const [area] = toCountryAreas(
      [{ country: 'CH', divisionId: 'switzerland', wkb }],
      new Map(),
    );

    expect(area).toEqual({ code: 'CH', wkb });
  });
});
