import { DataTableSkeleton } from "@/components/admin/data-table";
import { KpiGridSkeleton, SectionTitleSkeleton } from "@/components/admin/page-skeleton";
import { PageHeaderSkeleton } from "@/components/layout/page-header";
import { Separator } from "@/components/ui/separator";

/** Placeholder of the team page, in its layout: header, roles, the members, then the permission matrix. */
export default function AdminTeamLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <PageHeaderSkeleton width="w-40" />
      <KpiGridSkeleton count={3} />
      <Separator />
      <DataTableSkeleton rows={4} />
      <Separator />
      <section className="flex flex-col gap-3">
        <SectionTitleSkeleton description />
        <DataTableSkeleton rows={8} />
      </section>
    </div>
  );
}
