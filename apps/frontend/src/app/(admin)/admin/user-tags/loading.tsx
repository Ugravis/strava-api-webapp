import { TablePageSkeleton } from "@/components/admin/page-skeleton";

/** Placeholder of the user tags, in the layout of the page: header, figures, then the table. */
export default function AdminUserTagsLoading() {
  return <TablePageSkeleton title="w-24" kpis={3} rows={6} />;
}
