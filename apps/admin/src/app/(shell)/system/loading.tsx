import { KpiGrid, KpiTileSkeleton } from "@/components/admin/kpi-tile";
import { DataTableSkeleton } from "@kilotrace/ui/components/admin/data-table";
import { PageHeaderSkeleton } from "@kilotrace/ui/components/layout/page-header";
import { Separator } from "@kilotrace/ui/components/ui/separator";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";

/** Placeholder of the maintenance page, in its layout: header, figures, banner, then the table of the settings. */
export default function AdminSystemLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <PageHeaderSkeleton width="w-40" />
      <KpiGrid columns={4}>
        {Array.from({ length: 4 }, (_, index) => (
          <KpiTileSkeleton key={index} />
        ))}
      </KpiGrid>
      <Skeleton className="h-36 w-full rounded-xl" />
      <Separator />
      <DataTableSkeleton rows={6} />
    </div>
  );
}
