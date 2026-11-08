"use client";

import { ADMIN_COMMIT_KINDS, type AdminCommit } from "@kilotrace/shared/admin";
import { useMemo } from "react";
import { type DataTableConfig, DataTable } from "@kilotrace/ui/components/admin/data-table";
import { useRowPanel } from "@kilotrace/ui/components/admin/detail";
import { fetchCommitsTable, loadCommit } from "./actions";
import { commitColumns, KINDS } from "./commits-columns";
import { CommitRowPanel } from "./commits-detail";

/** The commits of `main` or `develop`, a view each, latest first, opened in the side panel; `deployed` marks the one in production. */
export function CommitsTable({ deployed }: { deployed: string | null }) {
  const config = useMemo<DataTableConfig<AdminCommit>>(
    () => ({
      id: "commits",
      fetch: fetchCommitsTable,
      rowId: (commit) => commit.sha,
      noun: (count) => (count > 1 ? "commits" : "commit"),
      empty: { title: "Aucun commit", description: "L'historique de main apparaîtra ici." },
      search: "Titre, auteur, SHA ou #PR",
      defaultSort: { id: "date", desc: true },
      views: [
        { id: "main", label: "Branche main", params: { branch: "main" } },
        { id: "develop", label: "Branche develop", params: { branch: "develop" } },
      ],
      columns: commitColumns(deployed),
      facets: [{ id: "kind", label: "Type", options: ADMIN_COMMIT_KINDS.map((kind) => ({ value: kind, label: KINDS[kind].label })) }],
      groupings: [
        // Keys sent in the order of the kinds: their rank.
        { id: "kind", label: "Type", title: (key) => KINDS[ADMIN_COMMIT_KINDS[Number(key)] ?? "commit"].label },
        { id: "author", label: "Auteur", title: (key) => (key ? `@${key}` : "Sans compte GitHub") },
      ],
    }),
    [deployed],
  );
  const panel = useRowPanel<AdminCommit>({
    config,
    title: (commit) => commit.title,
    load: loadCommit,
    detail: (sha) => <CommitRowPanel sha={sha} deployed={deployed} />,
  });
  return <DataTable {...panel.table} />;
}
