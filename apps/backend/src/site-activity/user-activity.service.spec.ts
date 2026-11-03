import type { DataSource } from 'typeorm';
import { UserActivityService } from './user-activity.service';

describe('UserActivityService', () => {
  const setup = (query = jest.fn().mockResolvedValue([])) => ({
    query,
    service: new UserActivityService({ query } as unknown as DataSource),
  });

  it('writes a user once per UTC day', () => {
    const { query, service } = setup();
    service.record('a', new Date('2026-11-03T08:00:00Z'));
    service.record('a', new Date('2026-11-03T22:00:00Z'));
    service.record('b', new Date('2026-11-03T22:00:00Z'));
    service.record('a', new Date('2026-11-04T00:10:00Z'));
    const calls = query.mock.calls as [string, string[]][];
    expect(calls.map(([, params]) => params)).toEqual([
      ['a', '2026-11-03'],
      ['b', '2026-11-03'],
      ['a', '2026-11-04'],
    ]);
  });

  it('writes the day again after a failed write', async () => {
    const { query, service } = setup(
      jest.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue([]),
    );
    const now = new Date('2026-11-03T08:00:00Z');
    service.record('a', now);
    await new Promise((resolve) => setImmediate(resolve));
    service.record('a', now);
    expect(query).toHaveBeenCalledTimes(2);
  });
});
