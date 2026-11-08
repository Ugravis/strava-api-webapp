import { TablePageSkeleton } from "@/components/admin/page-skeleton";

/** Placeholder of the reserved usernames, in the layout of the page: header, figures, then the table. */
export default function AdminReservedUsernamesLoading() {
  return <TablePageSkeleton title="w-56" kpis={3} />;
}
