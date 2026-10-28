import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder of the permissions page, in its layout. */
export default function AdminTeamLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
