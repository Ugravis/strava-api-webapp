import { toCountryAreas } from './country-areas';

describe('toCountryAreas', () => {
  const wkb = new Uint8Array([1]);

  it('attaches the dependencies to their sovereign country', () => {
    const areas = toCountryAreas(
      [
        { country: 'FR', divisionId: 'france', wkb },
        { country: 'RE', divisionId: 'reunion', wkb },
        { country: 'SJ', divisionId: 'svalbard', wkb },
      ],
      new Map([
        ['reunion', 'FR'],
        ['svalbard', 'NO'],
      ]),
    );

    expect(areas.map((area) => area.code)).toEqual(['FR', 'FR', 'NO']);
  });

  it('keeps Greenland as a country of its own', () => {
    const [area] = toCountryAreas(
      [{ country: 'GL', divisionId: 'greenland', wkb }],
      new Map([['greenland', 'DK']]),
    );

    expect(area.code).toBe('GL');
  });

  it('keeps the code of an area without sovereign country', () => {
    const [area] = toCountryAreas(
      [{ country: 'CH', divisionId: 'switzerland', wkb }],
      new Map(),
    );

    expect(area).toEqual({ code: 'CH', wkb });
  });
});
