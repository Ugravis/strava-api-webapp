import type { AdminMapVersion } from "@kilotrace/shared/admin";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { DatasetMap } from "./dataset-map";

/**
 * The public map with the whole dataset, full screen, for the team to audit
 * it: every member reads, `stations.edit` renames and hides from the panel.
 */
export default async function AdminDatasetMapPage() {
  const { permissions } = await requireAdminMember();
  const result = await adminApi<AdminMapVersion>("/map/version");
  if (!result.ok) throw new Error(`Admin map version: ${result.status}`);
  return <DatasetMap versions={result.data} rights={{ edit: permissions.includes("stations.edit") }} />;
}
