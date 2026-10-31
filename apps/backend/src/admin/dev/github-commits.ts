import type { AdminCommit, AdminCommitBranch } from '@kilotrace/shared/admin';

/** The fields of `GET /repos/{owner}/{repo}/commits` the commits page reads. */
export interface GithubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
  author: { login: string } | null;
  parents: { sha: string }[];
}

/** `Merge pull request #126 from owner/branch`, as GitHub writes it. */
const PULL_REQUEST_MERGE = /^Merge pull request #(\d+)/;

/**
 * `line` holds the commits of the first-parent line of `branch`: a merge
 * among them on `main` is a release.
 */
export function toAdminCommit(
  commit: GithubCommit,
  line: ReadonlySet<string>,
  branch: AdminCommitBranch,
): AdminCommit {
  const [subject, ...body] = commit.commit.message.split('\n');
  const pullRequest = PULL_REQUEST_MERGE.exec(subject);
  // The body of a pull request merge starts with its title.
  const title = pullRequest && body.find((line) => line.trim());
  const merge = commit.parents.length > 1;
  return {
    sha: commit.sha,
    title: title ? title.trim() : subject,
    pullRequest: pullRequest ? Number(pullRequest[1]) : null,
    author: commit.commit.author?.name ?? commit.author?.login ?? '—',
    date: commit.commit.author?.date ?? new Date(0).toISOString(),
    url: commit.html_url,
    kind: !merge
      ? 'commit'
      : branch === 'main' && line.has(commit.sha)
        ? 'release'
        : 'merge',
  };
}

/**
 * The latest commits `fresh`, from the head, stitched onto the history known
 * `known` at the first commit they share; null while they share none, i.e.
 * more pages are needed.
 */
export function stitchHistory(
  fresh: readonly GithubCommit[],
  known: readonly GithubCommit[],
): GithubCommit[] | null {
  const index = new Map(known.map((commit, at) => [commit.sha, at]));
  const shared = fresh.findIndex((commit) => index.has(commit.sha));
  if (shared === -1) return null;
  return [
    ...fresh.slice(0, shared),
    ...known.slice(index.get(fresh[shared].sha)),
  ];
}

/**
 * Commits reached from the first of `commits` (the head of the branch) by
 * following first parents, i.e. `git log --first-parent`. GitHub lists a
 * parent after its children, so the line is complete for the listed commits
 * as long as every page before them is included.
 */
export function firstParentLine(commits: readonly GithubCommit[]): Set<string> {
  const bySha = new Map(commits.map((commit) => [commit.sha, commit]));
  const line = new Set<string>();
  let current: GithubCommit | undefined = commits[0];
  while (current && !line.has(current.sha)) {
    line.add(current.sha);
    current = bySha.get(current.parents[0]?.sha ?? '');
  }
  return line;
}
