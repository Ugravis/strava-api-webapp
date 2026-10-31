import {
  firstParentLine,
  type GithubCommit,
  stitchHistory,
  toAdminCommit,
} from './github-commits';

const github = (
  sha: string,
  parents: string[],
  message = 'Merge pull request #126 from o/feat\n\nfeat: admin dev page',
): GithubCommit => ({
  sha,
  html_url: `https://github.com/o/r/commit/${sha}`,
  commit: {
    message,
    author: { name: 'Ulysse', date: '2026-10-28T14:00:00Z' },
  },
  author: { login: 'ugravis' },
  parents: parents.map((parent) => ({ sha: parent })),
});

describe('toAdminCommit', () => {
  it('reads the title and number of a merged pull request', () => {
    expect(
      toAdminCommit(github('abc', ['m', 'f']), new Set(['abc']), 'main'),
    ).toEqual({
      sha: 'abc',
      title: 'feat: admin dev page',
      pullRequest: 126,
      author: 'Ulysse',
      date: '2026-10-28T14:00:00Z',
      url: 'https://github.com/o/r/commit/abc',
      kind: 'release',
    });
  });

  it('keeps the first line of any other message', () => {
    const commit = toAdminCommit(
      github('def', ['m'], 'fix(frontend): a bug\n\nDetails.'),
      new Set(['def']),
      'main',
    );

    expect(commit).toMatchObject({
      title: 'fix(frontend): a bug',
      pullRequest: null,
      kind: 'commit',
    });
  });

  it('tells a merge brought by a branch from a release on main', () => {
    expect(
      toAdminCommit(github('abc', ['m', 'f']), new Set(), 'main').kind,
    ).toBe('merge');
  });

  it('has no release on develop', () => {
    expect(
      toAdminCommit(github('abc', ['m', 'f']), new Set(['abc']), 'develop')
        .kind,
    ).toBe('merge');
  });
});

describe('firstParentLine', () => {
  it('follows the first parents from the head', () => {
    // main: m2 merges develop (d2, itself merging f1 into d1) onto m1.
    const commits = [
      github('m2', ['m1', 'd2']),
      github('d2', ['d1', 'f1']),
      github('f1', ['d1']),
      github('d1', ['m1']),
      github('m1', ['m0']),
    ];

    expect([...firstParentLine(commits)]).toEqual(['m2', 'm1']);
  });

  it('is empty without commits', () => {
    expect(firstParentLine([]).size).toBe(0);
  });
});

describe('stitchHistory', () => {
  const known = [github('c', ['b']), github('b', ['a']), github('a', [])];

  it('puts the new commits before the known history', () => {
    const fresh = [github('e', ['d']), github('d', ['c']), github('c', ['b'])];

    expect(stitchHistory(fresh, known)?.map(({ sha }) => sha)).toEqual([
      'e',
      'd',
      'c',
      'b',
      'a',
    ]);
  });

  it('drops the known commits no longer on the branch', () => {
    const fresh = [github('x', ['b']), github('b', ['a'])];

    expect(stitchHistory(fresh, known)?.map(({ sha }) => sha)).toEqual([
      'x',
      'b',
      'a',
    ]);
  });

  it('needs more pages without a shared commit', () => {
    expect(stitchHistory([github('z', ['y'])], known)).toBeNull();
  });
});
