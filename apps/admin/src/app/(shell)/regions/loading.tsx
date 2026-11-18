import { TablePageSkeleton } from "@/components/admin/page-skeleton";

/** Placeholder of the regions, in the layout of the page: header, figures, then the table. */
export default function AdminRegionsLoading() {
  return <TablePageSkeleton title="w-28" kpis={4} rows={8} />;
}
