"use server";

import { ADMIN_COMMIT_BRANCHES, type AdminCommit, type AdminCommitBranch } from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import { fetchAdminTable } from "@/lib/admin/table";

/** A page of the commits of the branch of the view, `main` by default. */
export async function fetchCommitsTable(query: TableQuery, params: Record<string, string>): Promise<TablePage<AdminCommit>> {
  const branch = ADMIN_COMMIT_BRANCHES.includes(params.branch as AdminCommitBranch) ? params.branch : "main";
  return fetchAdminTable<AdminCommit>("/dev/commits/table", query, { branch });
}
