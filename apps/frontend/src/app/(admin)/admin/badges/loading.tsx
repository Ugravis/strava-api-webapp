import { KpiGrid, KpiTileSkeleton } from "@/components/admin/kpi-tile";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder of the badges, in the layout of the page: header, figures, then the tables. */
export default function AdminBadgesLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <KpiGrid>
        {Array.from({ length: 4 }, (_, index) => (
          <KpiTileSkeleton key={index} />
        ))}
      </KpiGrid>
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
