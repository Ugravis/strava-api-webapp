import { DataTableSkeleton } from "@kilotrace/ui/components/admin/data-table";
import { KpiGrid, KpiTileSkeleton } from "@/components/admin/kpi-tile";
import { PageHeaderSkeleton } from "@kilotrace/ui/components/layout/page-header";
import { Separator } from "@kilotrace/ui/components/ui/separator";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";

/*
 * Pieces of the `loading.tsx` of the back office, in the layout of its pages:
 * the shell lays them out with its own gaps, so they come as fragments.
 */

/** The figures above a list, `count` tiles over `count` columns. */
export function KpiGridSkeleton({ count = 4 }: { count?: 3 | 4 }) {
  return (
    <KpiGrid columns={count}>
      {Array.from({ length: count }, (_, index) => (
        <KpiTileSkeleton key={index} />
      ))}
    </KpiGrid>
  );
}

/** The title of a section, with its description line when it has one. */
export function SectionTitleSkeleton({ description = false }: { description?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className="h-5 w-32" />
      {description && <Skeleton className="my-0.5 h-4 w-80 max-w-full" />}
    </div>
  );
}

/** The most common page: its header, its figures, a rule, then its table. */
export function TablePageSkeleton({ title, kpis = 4, rows }: { title?: string; kpis?: 3 | 4; rows?: number }) {
  return (
    <>
      <PageHeaderSkeleton width={title} />
      <KpiGridSkeleton count={kpis} />
      <Separator />
      <DataTableSkeleton rows={rows} />
    </>
  );
}

/** A header with its choices of view below: a period select, then `toggles` switches. */
export function ViewHeaderSkeleton({ title, toggles = 1 }: { title?: string; toggles?: number }) {
  return (
    <div className="flex flex-col gap-3">
      <PageHeaderSkeleton width={title} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        {Array.from({ length: toggles }, (_, index) => (
          <Skeleton key={index} className="h-5 w-32" />
        ))}
      </div>
    </div>
  );
}

/** The `UnderlineTabs` of a page: its line, `count` labels on it. */
export function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex h-10 items-center border-b" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="flex flex-1 justify-center">
          <Skeleton className="h-4 w-20" />
        </span>
      ))}
    </div>
  );
}
