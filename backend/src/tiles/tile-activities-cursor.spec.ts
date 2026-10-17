import {
  decodeTileActivitiesCursor,
  encodeTileActivitiesCursor,
  TILE_ACTIVITIES_CURSOR,
} from './tile-activities-cursor';

describe('tile activities cursor', () => {
  const cursor = {
    startedAt: new Date('2026-05-04T07:30:00.000Z'),
    id: '0b6f3a52-6d0e-4c4f-9b8e-2f1c3d4e5a6b',
  };

  it('encodes a cursor the query validation accepts', () => {
    expect(encodeTileActivitiesCursor(cursor)).toMatch(TILE_ACTIVITIES_CURSOR);
  });

  it('decodes the cursor it encodes', () => {
    expect(
      decodeTileActivitiesCursor(encodeTileActivitiesCursor(cursor)),
    ).toEqual(cursor);
  });

  it('rejects a malformed cursor', () => {
    expect('2026-05-04_not-an-id').not.toMatch(TILE_ACTIVITIES_CURSOR);
  });
});
