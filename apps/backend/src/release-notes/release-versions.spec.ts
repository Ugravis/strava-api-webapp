import {
  compareVersions,
  defaultDisplayOf,
  hasReleaseNoteContent,
  parseVersion,
  releaseImpact,
  strongestDisplay,
  versionSortKey,
} from '@kilotrace/shared';

const ORDERED = [
  '0.2.0',
  '0.10.0',
  '1.0.0-alpha',
  '1.0.0-alpha.1',
  '1.0.0-alpha.beta',
  '1.0.0-beta',
  '1.0.0-beta.2',
  '1.0.0-beta.11',
  '1.0.0-rc.1',
  '1.0.0',
  '1.0.1',
];

describe('release versions', () => {
  it('reads major.minor.patch, without prefix', () => {
    expect(parseVersion('1.12.3')).toEqual({
      major: 1,
      minor: 12,
      patch: 3,
      prerelease: [],
    });
    expect(parseVersion('v1.2.3')).toBeNull();
    expect(parseVersion('1.2')).toBeNull();
    expect(parseVersion('01.2.3')).toBeNull();
  });

  it('reads pre-releases and build metadata', () => {
    expect(parseVersion('1.0.0-beta.1')).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: ['beta', 1],
    });
    expect(parseVersion('1.0.0-rc.1+20261103')?.prerelease).toEqual(['rc', 1]);
    expect(parseVersion('1.0.0-')).toBeNull();
    expect(parseVersion('1.0.0-beta.01')).toBeNull();
  });

  it('orders pre-releases before their release, as Semantic Versioning does', () => {
    const shuffled = [...ORDERED].reverse();
    expect(shuffled.sort(compareVersions)).toEqual(ORDERED);
  });

  it('sorts the database key in the same order', () => {
    const keys = ORDERED.map(versionSortKey);
    expect([...keys].sort()).toEqual(keys);
  });

  it('compares as numbers, not as text', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0);
    expect(compareVersions('0.2.0', '0.2.0')).toBe(0);
    expect(['0.10.0', '0.2.1', '0.2.0', '1.0.0'].sort(compareVersions)).toEqual(
      ['0.2.0', '0.2.1', '0.10.0', '1.0.0'],
    );
  });

  it('tells the impact of a version by its number', () => {
    expect(releaseImpact('2.0.0')).toBe('major');
    expect(releaseImpact('0.3.0')).toBe('minor');
    expect(releaseImpact('0.3.1')).toBe('patch');
    expect(releaseImpact('1.0.0-beta.1')).toBe('patch');
  });

  it('shows a larger change louder by default', () => {
    expect(defaultDisplayOf('1.0.0')).toBe('popup');
    expect(defaultDisplayOf('1.1.0')).toBe('banner');
    expect(defaultDisplayOf('1.1.1')).toBe('notification');
  });

  it('keeps the strongest display of several notes', () => {
    expect(strongestDisplay(['notification', 'banner'])).toBe('banner');
    expect(strongestDisplay(['banner', 'popup', 'none'])).toBe('popup');
    expect(strongestDisplay([])).toBe('none');
  });

  it('finds no content in blank texts', () => {
    const sections = { new: null, improved: '  ', fixed: null, other: null };
    expect(hasReleaseNoteContent({ title: ' ', summary: null, sections })).toBe(
      false,
    );
    expect(
      hasReleaseNoteContent({
        title: null,
        summary: null,
        sections: { ...sections, fixed: '- Bug' },
      }),
    ).toBe(true);
  });
});
