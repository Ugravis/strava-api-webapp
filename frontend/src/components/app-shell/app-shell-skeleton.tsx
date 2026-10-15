import { Skeleton } from "@/components/ui/skeleton";

/** Static fallback shown while the session is resolved. */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-svh w-full" aria-busy>
      <div className="hidden w-64 shrink-0 flex-col gap-4 border-r bg-sidebar p-3 md:flex">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-full" />
        <div className="mt-auto flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="h-14 border-b md:h-12" />
        <div className="flex flex-col gap-4 p-4 md:p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full max-w-2xl" />
        </div>
      </div>
    </div>
  );
}
