import { KpiGrid, KpiTileSkeleton } from "@/components/admin/kpi-tile";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder of the release notes, in the layout of the page: header, figures, then the table. */
export default function AdminReleaseNotesLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <KpiGrid>
        {Array.from({ length: 4 }, (_, index) => (
          <KpiTileSkeleton key={index} spark={false} />
        ))}
      </KpiGrid>
      <Skeleton className="h-9 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
