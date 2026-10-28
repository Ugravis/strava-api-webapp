import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder of the distinctions, in the layout of the page. */
export default function AdminDistinctionsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="mb-1 h-4 w-28" />
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[3.25rem] w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
