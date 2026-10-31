"use client";

import { ADMIN_COMMIT_KINDS, type AdminCommit, type AdminCommitKind } from "@kilotrace/shared/admin";
import { CircleDotIcon, ClockIcon, GitCommitHorizontalIcon, GitMergeIcon, GitPullRequestIcon, HashIcon, RocketIcon, UserPenIcon } from "lucide-react";
import { useMemo } from "react";
import {
  codeColumn,
  customColumn,
  type DataTableConfig,
  DataTable,
  dateColumn,
  LinkCell,
  lookColumn,
  Mark,
  statusColumn,
  type Tone,
} from "@/components/admin/data-table";
import { UserAvatar } from "@/components/user/user-avatar";
import { fetchCommitsTable } from "./actions";

const KINDS: Record<AdminCommitKind, { label: string; tone: Tone }> = {
  release: { label: "Release", tone: "blue" },
  merge: { label: "Merge", tone: "violet" },
  commit: { label: "Commit", tone: "gray" },
};

/** The pull request on GitHub, next to the commit in the same repository. */
const pullRequestHref = (commit: AdminCommit) => (commit.pullRequest === null ? null : commit.url.replace(/\/commit\/\w+$/, `/pull/${commit.pullRequest}`));

/** The commits of `main` or `develop`, a view each, latest first; `deployed` marks the one in production. */
export function CommitsTable({ deployed }: { deployed: string | null }) {
  const config = useMemo<DataTableConfig<AdminCommit>>(() => {
    const isDeployed = (commit: AdminCommit) => !!deployed && commit.sha.startsWith(deployed);
    return {
      id: "commits",
      fetch: fetchCommitsTable,
      rowId: (commit) => commit.sha,
      onOpen: (commit) => window.open(commit.url, "_blank", "noopener"),
      noun: (count) => (count > 1 ? "commits" : "commit"),
      empty: { title: "Aucun commit", description: "L'historique de main apparaîtra ici." },
      search: "Titre, auteur, SHA ou #PR",
      defaultSort: { id: "date", desc: true },
      views: [
        { id: "main", label: "Branche main", params: { branch: "main" } },
        { id: "develop", label: "Branche develop", params: { branch: "develop" } },
      ],
      columns: [
        lookColumn({
          id: "title",
          header: "Commit",
          icon: <GitCommitHorizontalIcon />,
          sortable: true,
          value: (commit) => ({ icon: commit.kind !== "commit" ? <GitMergeIcon /> : <GitCommitHorizontalIcon />, name: commit.title }),
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
        lookColumn({
          id: "author",
          header: "Auteur",
          icon: <UserPenIcon />,
          sortable: true,
          locked: false,
          value: (commit) => ({
            icon: <UserAvatar user={{ username: commit.author, displayName: commit.author, avatarUrl: commit.avatarUrl }} className="size-6" fallbackClassName="text-[9px]" />,
            name: commit.author,
          }),
        }),
        dateColumn({ id: "date", header: "Date", icon: <ClockIcon />, sortable: true, value: (commit) => commit.date, relative: true }),
        codeColumn({ id: "sha", header: "SHA", icon: <HashIcon />, value: (commit) => commit.sha.slice(0, 7), width: "max-w-20" }),
      ],
      facets: [{ id: "kind", label: "Type", options: ADMIN_COMMIT_KINDS.map((kind) => ({ value: kind, label: KINDS[kind].label })) }],
      groupings: [
        // Keys sent in the order of the kinds: their rank.
        { id: "kind", label: "Type", title: (key) => KINDS[ADMIN_COMMIT_KINDS[Number(key)] ?? "commit"].label },
        { id: "author", label: "Auteur", title: (key) => key },
      ],
    };
  }, [deployed]);
  return <DataTable config={config} />;
}
