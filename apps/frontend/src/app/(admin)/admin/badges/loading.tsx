import { DataTableSkeleton } from "@kilotrace/ui/components/admin/data-table";
import { KpiGridSkeleton, SectionTitleSkeleton } from "@/components/admin/page-skeleton";
import { PageHeaderSkeleton } from "@kilotrace/ui/components/layout/page-header";
import { Separator } from "@kilotrace/ui/components/ui/separator";

/** Placeholder of the badges, in the layout of the page: header, figures, the collections, then the badges. */
export default function AdminBadgesLoading() {
  return (
    <>
      <PageHeaderSkeleton width="w-32" />
      <KpiGridSkeleton />
      <Separator />
      <section className="flex flex-col gap-3">
        <SectionTitleSkeleton description />
        <DataTableSkeleton rows={4} />
      </section>
      <Separator />
      <section className="flex flex-col gap-3">
        <SectionTitleSkeleton />
        <DataTableSkeleton rows={8} />
      </section>
    </>
  );
}
