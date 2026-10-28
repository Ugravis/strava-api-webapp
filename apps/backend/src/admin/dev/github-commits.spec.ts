import {
  firstParentLine,
  type GithubCommit,
  lastPage,
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
    expect(toAdminCommit(github('abc', ['m', 'f']), new Set(['abc']))).toEqual({
      sha: 'abc',
      title: 'feat: admin dev page',
      pullRequest: 126,
      author: 'Ulysse',
      date: '2026-10-28T14:00:00Z',
      url: 'https://github.com/o/r/commit/abc',
      merge: true,
      mainMerge: true,
    });
  });

  it('keeps the first line of any other message', () => {
    const commit = toAdminCommit(
      github('def', ['m'], 'fix(frontend): a bug\n\nDetails.'),
      new Set(['def']),
    );

    expect(commit).toMatchObject({
      title: 'fix(frontend): a bug',
      pullRequest: null,
      merge: false,
      mainMerge: false,
    });
  });

  it('tells a merge brought by a branch from a merge on main', () => {
    expect(toAdminCommit(github('abc', ['m', 'f']), new Set()).mainMerge).toBe(
      false,
    );
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

describe('lastPage', () => {
  it('reads the last page of the Link header', () => {
    const link =
      '<https://api.github.com/repos/o/r/commits?sha=main&per_page=30&page=2>; rel="next", ' +
      '<https://api.github.com/repos/o/r/commits?sha=main&per_page=30&page=7>; rel="last"';

    expect(lastPage(link, 1)).toBe(7);
  });

  it('is the current page on the last one', () => {
    expect(lastPage('<https://x?page=6>; rel="prev"', 7)).toBe(7);
    expect(lastPage(null, 1)).toBe(1);
  });
});
