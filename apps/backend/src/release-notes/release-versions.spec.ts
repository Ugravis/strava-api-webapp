import {
  compareVersions,
  defaultDisplayOf,
  hasReleaseNoteContent,
  parseVersion,
  releaseImpact,
  strongestDisplay,
} from '@kilotrace/shared';

describe('release versions', () => {
  it('reads major.minor.patch only', () => {
    expect(parseVersion('1.12.3')).toEqual([1, 12, 3]);
    expect(parseVersion('v1.2.3')).toBeNull();
    expect(parseVersion('1.2')).toBeNull();
    expect(parseVersion('01.2.3')).toBeNull();
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
