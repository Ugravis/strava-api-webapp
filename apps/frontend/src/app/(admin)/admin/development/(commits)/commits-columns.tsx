"use client";

import type { AdminCommit, AdminCommitKind } from "@kilotrace/shared/admin";
import { CircleDotIcon, ClockIcon, GitCommitHorizontalIcon, GitMergeIcon, GitPullRequestIcon, HashIcon, RocketIcon, UserPenIcon } from "lucide-react";
import { codeColumn, customColumn, type DataTableColumn, dateColumn, LinkCell, lookColumn, Mark, statusColumn, type Tone, userColumn } from "@/components/admin/data-table";

/*
 * How a commit is drawn, shared by its table and its detail.
 */

/** The icon of the commit in the colour of its kind, as the dots of « Type » (blue-500, violet-500); a plain commit stays grey. */
export const ICON_COLORS: Record<AdminCommitKind, string | null> = { release: "#3b82f6", merge: "#8b5cf6", commit: null };

export const KINDS: Record<AdminCommitKind, { label: string; tone: Tone }> = {
  release: { label: "Release", tone: "blue" },
  merge: { label: "Merge", tone: "violet" },
  commit: { label: "Commit", tone: "gray" },
};

export const commitIcon = (commit: AdminCommit) => (commit.kind !== "commit" ? <GitMergeIcon /> : <GitCommitHorizontalIcon />);

/** The pull request on GitHub, next to the commit in the same repository. */
export const pullRequestHref = (commit: AdminCommit) => (commit.pullRequest === null ? null : commit.url.replace(/\/commit\/\w+$/, `/pull/${commit.pullRequest}`));

/** Whether `commit` is the one in production, `deployed` its short SHA. */
export const isDeployedOf = (deployed: string | null) => (commit: AdminCommit) => !!deployed && commit.sha.startsWith(deployed);

/** The columns of the commits, the deployed one marked. */
export function commitColumns(deployed: string | null): DataTableColumn<AdminCommit>[] {
  const isDeployed = isDeployedOf(deployed);
  return [
    lookColumn({
      id: "title",
      header: "Commit",
      icon: <GitCommitHorizontalIcon />,
      sortable: true,
      href: (commit) => commit.url,
      value: (commit) => ({ icon: commitIcon(commit), name: commit.title, color: ICON_COLORS[commit.kind] }),
      marks: (commit) => isDeployed(commit) && <Mark label="Déployé" tone="green" icon={<RocketIcon />} />,
    }),
    statusColumn({ id: "kind", header: "Type", icon: <CircleDotIcon />, value: (commit) => commit.kind, statuses: KINDS }),
    customColumn({
      id: "pullRequest",
      header: "Pull request",
      icon: <GitPullRequestIcon />,
      sortable: true,
      cell: (commit) => <LinkCell href={pullRequestHref(commit)}>#{commit.pullRequest}</LinkCell>,
      copy: (commit) => (commit.pullRequest === null ? null : `#${commit.pullRequest}`),
    }),
    userColumn({
      id: "author",
      header: "Auteur",
      icon: <UserPenIcon />,
      sortable: true,
      locked: false,
      href: (commit) => (commit.login ? `https://github.com/${commit.login}` : null),
      value: (commit) => (commit.login ? { username: commit.login, displayName: commit.author, avatarUrl: commit.avatarUrl } : null),
    }),
    dateColumn({ id: "date", header: "Date", icon: <ClockIcon />, sortable: true, value: (commit) => commit.date, relative: true }),
    codeColumn({ id: "sha", header: "SHA", icon: <HashIcon />, value: (commit) => commit.sha.slice(0, 7), href: (commit) => commit.url, width: "max-w-20" }),
  ];
}
