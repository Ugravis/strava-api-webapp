import { migrationStatus } from './migration-status';

describe('migrationStatus', () => {
  it('lists the applied migrations, the latest first', () => {
    const { applied, pending } = migrationStatus(
      ['CreateAuthSchema1791995699169', 'AddBadges1792346092412'],
      [
        {
          id: 1,
          timestamp: '1791995699169',
          name: 'CreateAuthSchema1791995699169',
        },
        { id: 2, timestamp: '1792346092412', name: 'AddBadges1792346092412' },
      ],
    );

    expect(applied.map((migration) => migration.id)).toEqual([2, 1]);
    expect(applied[1].createdAt).toBe(new Date(1791995699169).toISOString());
    expect(pending).toEqual([]);
  });

  it('keeps the migrations of the code missing from the database', () => {
    const { pending } = migrationStatus(
      ['B1792346092412', 'A1791995699169', 'Applied1791000000000'],
      [{ id: 1, timestamp: 1791000000000, name: 'Applied1791000000000' }],
    );

    expect(pending).toEqual([
      {
        name: 'A1791995699169',
        createdAt: new Date(1791995699169).toISOString(),
        id: null,
      },
      {
        name: 'B1792346092412',
        createdAt: new Date(1792346092412).toISOString(),
        id: null,
      },
    ]);
  });
});
