"use server";

import { ADMIN_COMMIT_BRANCHES, type AdminCommit, type AdminCommitBranch } from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import { fetchAdminTable } from "@/lib/admin/table";

/** A page of the commits of the branch of the view, `main` by default. */
export async function fetchCommitsTable(query: TableQuery, params: Record<string, string>): Promise<TablePage<AdminCommit>> {
  const branch = ADMIN_COMMIT_BRANCHES.includes(params.branch as AdminCommitBranch) ? params.branch : "main";
  return fetchAdminTable<AdminCommit>("/dev/commits/table", query, { branch });
}

const SHA = /^[0-9a-f]{7,40}$/i;

/** A commit of `main` or `develop` by its SHA, searched in the history served to the table; null when in neither. */
export async function loadCommit(sha: string): Promise<AdminCommit | null> {
  if (!SHA.test(sha)) return null;
  for (const branch of ADMIN_COMMIT_BRANCHES) {
    const page = await fetchAdminTable<AdminCommit>(
      "/dev/commits/table",
      { q: sha, filters: {}, sort: { id: "date", desc: true }, groupBy: null, folded: [], page: 1, pageSize: 10 },
      { branch },
    );
    for (const entry of page.entries) if ("row" in entry && entry.row.sha === sha) return entry.row;
  }
  return null;
}
