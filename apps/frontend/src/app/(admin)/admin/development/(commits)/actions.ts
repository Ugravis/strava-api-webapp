"use server";

import type { AdminCommit } from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import { fetchAdminTable } from "@/lib/admin/table";

/** A page of the commits of `main`, as GitHub serves them. */
export async function fetchCommitsTable(query: TableQuery): Promise<TablePage<AdminCommit>> {
  return fetchAdminTable<AdminCommit>("/dev/commits/table", query);
}
