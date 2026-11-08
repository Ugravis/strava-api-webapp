import { TablePageSkeleton } from "@/components/admin/page-skeleton";

/** Placeholder of the logs, in the layout of the page: header, figures, then the table. */
export default function AdminAuditLogLoading() {
  return <TablePageSkeleton title="w-32" rows={10} />;
}
