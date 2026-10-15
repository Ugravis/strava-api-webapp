import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-5 w-64 max-w-full" />
    </div>
  );
}
