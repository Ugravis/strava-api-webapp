/**
 * Reader of the OPL format of osmium (`osmium cat -f opl,add_metadata=false`):
 * one object per line, `n`, `w` or `r` and its id, then fields starting
 * with a letter: `T` tags, `x` and `y` coordinates, `N` way nodes, `M`
 * relation members. Special characters are escaped as `%<hex code point>%`.
 */

export type Tags = Record<string, string>;

export interface OplNode {
  type: 'n';
  id: number;
  tags: Tags | null;
  lon: number;
  lat: number;
}

export interface OplWay {
  type: 'w';
  id: number;
  tags: Tags | null;
  nodes: number[];
}

export interface OplMember {
  type: 'n' | 'w' | 'r';
  id: number;
  role: string;
}

export interface OplRelation {
  type: 'r';
  id: number;
  tags: Tags | null;
  members: OplMember[];
}

export type OplObject = OplNode | OplWay | OplRelation;

const ESCAPE = /%([0-9a-fA-F]+)%/g;

function unescape(value: string): string {
  return value.includes('%')
    ? value.replace(ESCAPE, (_, hex: string) =>
        String.fromCodePoint(parseInt(hex, 16)),
      )
    : value;
}

/** Tags of a `T` field, without its letter; null without tags. */
export function parseTags(field: string): Tags | null {
  if (field === '') {
    return null;
  }
  const tags: Tags = {};
  // Commas and equal signs inside keys and values are escaped.
  for (const pair of field.split(',')) {
    const equal = pair.indexOf('=');
    if (equal > 0) {
      tags[unescape(pair.slice(0, equal))] = unescape(pair.slice(equal + 1));
    }
  }
  return tags;
}

/** One line of OPL; null for an empty or unknown line. */
export function parseOplLine(line: string): OplObject | null {
  const type = line[0];
  if (type !== 'n' && type !== 'w' && type !== 'r') {
    return null;
  }
  const fields = line.split(' ');
  const id = Number(fields[0].slice(1));
  let tags: Tags | null = null;
  let lon = NaN;
  let lat = NaN;
  let nodes: number[] = [];
  let members: OplMember[] = [];
  for (let i = 1; i < fields.length; i++) {
    const field = fields[i];
    const value = field.slice(1);
    switch (field[0]) {
      case 'T':
        tags = parseTags(value);
        break;
      case 'x':
        lon = value === '' ? NaN : Number(value);
        break;
      case 'y':
        lat = value === '' ? NaN : Number(value);
        break;
      case 'N':
        nodes =
          value === ''
            ? []
            : value.split(',').map((ref) => Number(ref.slice(1)));
        break;
      case 'M':
        members = value === '' ? [] : value.split(',').map(parseMember);
        break;
    }
  }
  if (type === 'n') {
    return { type, id, tags, lon, lat };
  }
  if (type === 'w') {
    return { type, id, tags, nodes };
  }
  return { type, id, tags, members };
}

function parseMember(member: string): OplMember {
  const at = member.indexOf('@');
  return {
    type: member[0] as OplMember['type'],
    id: Number(member.slice(1, at)),
    role: unescape(member.slice(at + 1)),
  };
}
