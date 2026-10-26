import { Skeleton } from "@kilotrace/ui/components/skeleton";

export function ConnectionSettingSkeleton() {
  return (
    <div className="flex items-center gap-3" aria-busy>
      <Skeleton className="size-10 rounded-lg" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-48 max-w-full" />
      </div>
    </div>
  );
}
