import { TablePageSkeleton } from "@/components/admin/page-skeleton";

/** Placeholder of the stations, in the layout of the page: header, figures, then the table. */
export default function AdminStationsLoading() {
  return <TablePageSkeleton title="w-24" kpis={4} rows={8} />;
}
