import type { AdminCommit } from '@kilotrace/shared/admin';
import {
  type GithubCommit,
  toAdminCommit,
  undeployedCount,
} from './github-commits';

const github = (
  sha: string,
  parents: number,
  message = 'Merge pull request #126 from o/feat\n\nfeat: admin dev page',
): GithubCommit => ({
  sha,
  html_url: `https://github.com/o/r/commit/${sha}`,
  commit: {
    message,
    author: { name: 'Ulysse', date: '2026-10-28T14:00:00Z' },
  },
  author: { login: 'ugravis' },
  parents: Array.from({ length: parents }, (_, index) => ({
    sha: `p${index}`,
  })),
});

describe('toAdminCommit', () => {
  it('reads the title and number of a merged pull request', () => {
    expect(toAdminCommit(github('abc', 2))).toEqual({
      sha: 'abc',
      title: 'feat: admin dev page',
      pullRequest: 126,
      author: 'Ulysse',
      date: '2026-10-28T14:00:00Z',
      url: 'https://github.com/o/r/commit/abc',
      merge: true,
    });
  });

  it('keeps the first line of any other message', () => {
    const commit = toAdminCommit(
      github('def', 1, 'fix(frontend): a bug\n\nDetails.'),
    );

    expect(commit).toMatchObject({
      title: 'fix(frontend): a bug',
      pullRequest: null,
      merge: false,
    });
  });
});

describe('undeployedCount', () => {
  const commits = ['c3aaaa', 'c2bbbb', 'c1cccc'].map(
    (sha) => ({ sha }) as AdminCommit,
  );

  it('counts the commits newer than the deployed one', () => {
    expect(undeployedCount(commits, 'c1cccc')).toBe(2);
    expect(undeployedCount(commits, 'c3a')).toBe(0);
  });

  it('is null when the deployed commit is unknown or not listed', () => {
    expect(undeployedCount(commits, null)).toBeNull();
    expect(undeployedCount(commits, 'c0dddd')).toBeNull();
  });
});
