import {
  layoutTablePage,
  mapTablePage,
  tablePageOf,
  tableQueryFromSearch,
  tableQueryToSearch,
} from '@kilotrace/shared/table';

describe('table query', () => {
  it('reads the wire format back', () => {
    const query = tableQueryFromSearch({
      q: ' marie ',
      sort: '-lastSeenAt',
      group: 'status',
      fold: 'active,staff',
      page: '3',
      size: '500',
      'f.status': 'active,suspended',
      'f.empty': '',
    });
    expect(query).toEqual({
      q: 'marie',
      filters: { status: ['active', 'suspended'], empty: [] },
      sort: { id: 'lastSeenAt', desc: true },
      groupBy: 'status',
      folded: ['active', 'staff'],
      page: 3,
      pageSize: 100,
    });
    const wire = new URLSearchParams(tableQueryToSearch(query));
    expect(tableQueryFromSearch(Object.fromEntries(wire))).toEqual({
      ...query,
      filters: { status: ['active', 'suspended'] },
    });
  });

  it('falls back on the defaults', () => {
    expect(tableQueryFromSearch({ page: '-2', size: 'x' })).toMatchObject({
      q: '',
      sort: { id: 'createdAt', desc: true },
      groupBy: null,
      page: 1,
      pageSize: 30,
    });
  });
});

describe('layoutTablePage', () => {
  it('cuts a table without groups', () => {
    expect(layoutTablePage(null, 65, [], 3, 30)).toEqual({
      page: 3,
      pages: 3,
      before: 60,
      visible: 65,
      parts: [{ group: null, title: false, rows: 5 }],
    });
    expect(layoutTablePage(null, 0, [], 4, 30)).toMatchObject({
      page: 1,
      pages: 1,
      parts: [],
    });
  });

  it('repeats the title of a group cut by a page', () => {
    const a = { key: 'a', count: 4 };
    const b = { key: 'b', count: 5 };
    expect(layoutTablePage([a, b], 9, [], 1, 6).parts).toEqual([
      { group: a, title: true, rows: 4 },
      { group: b, title: true, rows: 2 },
    ]);
    expect(layoutTablePage([a, b], 9, [], 2, 6)).toMatchObject({
      before: 6,
      parts: [{ group: b, title: true, rows: 3 }],
    });
  });

  it('keeps the title of a folded group, out of the count', () => {
    const a = { key: 'a', count: 6 };
    const b = { key: 'b', count: 40 };
    const c = { key: 'c', count: 1 };
    const layout = layoutTablePage([a, b, c], 47, ['b'], 1, 6);
    expect(layout).toMatchObject({ pages: 2, visible: 7 });
    expect(layout.parts).toEqual([
      { group: a, title: true, rows: 6 },
      { group: b, title: true, rows: 0 },
    ]);
  });
});

describe('tablePageOf', () => {
  it('sets the rows between the titles', async () => {
    const a = { key: 'a', count: 1 };
    const b = { key: 'b', count: 2 };
    const layout = layoutTablePage([a, b], 3, [], 1, 30);
    const page = tablePageOf(layout, [1, 2, 3], 3, {});
    expect(page.entries).toEqual([
      { group: a },
      { row: 1 },
      { group: b },
      { row: 2 },
      { row: 3 },
    ]);
    const mapped = await mapTablePage(page, (rows) => rows.map(String));
    expect(mapped.entries[1]).toEqual({ row: '1' });
  });
});
