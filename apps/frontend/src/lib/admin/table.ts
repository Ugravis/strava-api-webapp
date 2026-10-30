import "server-only";
import { type TablePage, type TableQuery, tableQueryToSearch } from "@kilotrace/shared/table";
import { adminApi } from "./api";

/**
 * A page of a data table, for the Server Action a `DataTable` fetches
 * through: the browser never calls `/api/admin` itself. Throws on a failed
 * call, which the table shows with a retry button.
 */
export async function fetchAdminTable<T>(path: string, query: TableQuery): Promise<TablePage<T>> {
  const result = await adminApi<TablePage<T>>(`${path}?${tableQueryToSearch(query)}`);
  if (!result.ok) throw new Error(`Admin table ${path}: ${result.status}`);
  return result.data;
}
