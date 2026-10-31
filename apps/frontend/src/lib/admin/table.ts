import "server-only";
import { type TablePage, type TableQuery, tableQueryToSearch } from "@kilotrace/shared/table";
import { adminApi } from "./api";

/**
 * A page of a data table, for the Server Action a `DataTable` fetches
 * through: the browser never calls `/api/admin` itself. Throws on a failed
 * call, which the table shows with a retry button. `params` go along, e.g.
 * a scope of the page outside the picks of the table.
 */
export async function fetchAdminTable<T>(path: string, query: TableQuery, params?: Record<string, string | undefined>): Promise<TablePage<T>> {
  const extra = new URLSearchParams(Object.entries(params ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const search = [tableQueryToSearch(query), extra.toString()].filter(Boolean).join("&");
  const result = await adminApi<TablePage<T>>(`${path}?${search}`);
  if (!result.ok) throw new Error(`Admin table ${path}: ${result.status}`);
  return result.data;
}
