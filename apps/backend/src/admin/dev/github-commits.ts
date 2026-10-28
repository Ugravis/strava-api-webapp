import type { AdminCommit } from '@kilotrace/shared/admin';

/** The fields of `GET /repos/{owner}/{repo}/commits` the dev page reads. */
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

export function toAdminCommit(commit: GithubCommit): AdminCommit {
  const [subject, ...body] = commit.commit.message.split('\n');
  const pullRequest = PULL_REQUEST_MERGE.exec(subject);
  // The body of a pull request merge starts with its title.
  const title = pullRequest && body.find((line) => line.trim());
  return {
    sha: commit.sha,
    title: title ? title.trim() : subject,
    pullRequest: pullRequest ? Number(pullRequest[1]) : null,
    author: commit.commit.author?.name ?? commit.author?.login ?? '—',
    date: commit.commit.author?.date ?? new Date(0).toISOString(),
    url: commit.html_url,
    merge: commit.parents.length > 1,
  };
}

/**
 * Commits listed before the deployed one, null when it is unknown or not
 * listed. Matches a short sha too.
 */
export function undeployedCount(
  commits: readonly AdminCommit[],
  deployed: string | null,
): number | null {
  if (!deployed) {
    return null;
  }
  const index = commits.findIndex((commit) => commit.sha.startsWith(deployed));
  return index === -1 ? null : index;
}
