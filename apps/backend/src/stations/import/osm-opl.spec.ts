import { parseOplLine, parseTags } from './osm-opl';

describe('parseTags', () => {
  it('reads the tags, unescaping the special characters', () => {
    expect(
      parseTags('railway=station,name=Gare%20%du%20%Nord,note=a%2c%b%3d%c'),
    ).toEqual({
      railway: 'station',
      name: 'Gare du Nord',
      note: 'a,b=c',
    });
  });

  it('gives null without tags', () => {
    expect(parseTags('')).toBeNull();
  });
});

describe('parseOplLine', () => {
  it('reads a node', () => {
    expect(
      parseOplLine(
        'n248812250 Trailway=station,name=Melun x2.6551924 y48.5274833',
      ),
    ).toEqual({
      type: 'n',
      id: 248812250,
      tags: { railway: 'station', name: 'Melun' },
      lon: 2.6551924,
      lat: 48.5274833,
    });
  });

  it('reads a node without tags', () => {
    expect(parseOplLine('n1 T x-0.5 y51')).toEqual({
      type: 'n',
      id: 1,
      tags: null,
      lon: -0.5,
      lat: 51,
    });
  });

  it('reads a way and its nodes', () => {
    expect(
      parseOplLine('w6238794 Trailway=rail,usage=main Nn1,n2,n14296037913'),
    ).toEqual({
      type: 'w',
      id: 6238794,
      tags: { railway: 'rail', usage: 'main' },
      nodes: [1, 2, 14296037913],
    });
  });

  it('reads a relation and its members with their roles', () => {
    expect(
      parseOplLine(
        'r7 Ttype=route,route=train Mn1@stop,w2@,w3@platform_entry_only,r4@',
      ),
    ).toEqual({
      type: 'r',
      id: 7,
      tags: { type: 'route', route: 'train' },
      members: [
        { type: 'n', id: 1, role: 'stop' },
        { type: 'w', id: 2, role: '' },
        { type: 'w', id: 3, role: 'platform_entry_only' },
        { type: 'r', id: 4, role: '' },
      ],
    });
  });

  it('ignores other lines', () => {
    expect(parseOplLine('')).toBeNull();
    expect(parseOplLine('c12 k1')).toBeNull();
  });
});
