import { DataTableSkeleton } from "@/components/admin/data-table";
import { KpiGridSkeleton, SectionTitleSkeleton } from "@/components/admin/page-skeleton";
import { PageHeaderSkeleton } from "@/components/layout/page-header";
import { Separator } from "@/components/ui/separator";

/** Placeholder of the users, in the layout of the page: header, figures, the reports folded, then the accounts. */
export default function AdminUsersLoading() {
  return (
    <>
      <PageHeaderSkeleton width="w-40" />
      <KpiGridSkeleton />
      <Separator />
      <SectionTitleSkeleton />
      <Separator />
      <section className="flex flex-col gap-3">
        <SectionTitleSkeleton />
        <DataTableSkeleton rows={10} />
      </section>
    </>
  );
}
