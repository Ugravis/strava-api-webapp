"use client";

import { ADMIN_COMMITS_PER_PAGE, type AdminCommit } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
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
  textColumn,
  type Tone,
} from "@/components/admin/data-table";
import { fetchCommitsTable } from "./actions";

type Kind = "delivery" | "merge" | "commit";

/** Merges on `main` split the history in deliveries. */
const KINDS: Record<Kind, { label: string; tone: Tone }> = {
  delivery: { label: "Livraison", tone: "blue" },
  merge: { label: "Fusion", tone: "violet" },
  commit: { label: "Commit", tone: "gray" },
};

const kindOf = (commit: AdminCommit): Kind => (commit.mainMerge ? "delivery" : commit.merge ? "merge" : "commit");

/** The pull request on GitHub, next to the commit in the same repository. */
const pullRequestHref = (commit: AdminCommit) => (commit.pullRequest === null ? null : commit.url.replace(/\/commit\/\w+$/, `/pull/${commit.pullRequest}`));

/** The commits of `main`, latest first; `deployed` marks the one in production. */
export function CommitsTable({ deployed }: { deployed: string | null }) {
  const config = useMemo<DataTableConfig<AdminCommit>>(() => {
    const isDeployed = (commit: AdminCommit) => !!deployed && commit.sha.startsWith(deployed);
    return {
      id: "commits",
      fetch: (query: TableQuery) => fetchCommitsTable(query),
      rowId: (commit) => commit.sha,
      onOpen: (commit) => window.open(commit.url, "_blank", "noopener"),
      noun: (count) => (count > 1 ? "commits" : "commit"),
      empty: { title: "Aucun commit", description: "L'historique de main apparaîtra ici." },
      pageSize: ADMIN_COMMITS_PER_PAGE,
      columns: [
        lookColumn({
          id: "title",
          header: "Commit",
          icon: <GitCommitHorizontalIcon />,
          value: (commit) => ({ icon: commit.merge ? <GitMergeIcon /> : <GitCommitHorizontalIcon />, name: commit.title }),
          marks: (commit) => isDeployed(commit) && <Mark label="Déployé" tone="green" icon={<RocketIcon />} />,
        }),
        statusColumn({ id: "kind", header: "Type", icon: <CircleDotIcon />, value: kindOf, statuses: KINDS }),
        customColumn({
          id: "pullRequest",
          header: "Pull request",
          icon: <GitPullRequestIcon />,
          cell: (commit) => <LinkCell href={pullRequestHref(commit)}>#{commit.pullRequest}</LinkCell>,
          copy: (commit) => (commit.pullRequest === null ? null : `#${commit.pullRequest}`),
        }),
        textColumn({ id: "author", header: "Auteur", icon: <UserPenIcon />, value: (commit) => commit.author, width: "max-w-40" }),
        dateColumn({ id: "date", header: "Date", icon: <ClockIcon />, value: (commit) => commit.date, relative: true }),
        codeColumn({ id: "sha", header: "SHA", icon: <HashIcon />, value: (commit) => commit.sha.slice(0, 7), width: "max-w-20" }),
      ],
    };
  }, [deployed]);
  return <DataTable config={config} />;
}
