"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSavedSidebarOpen } from "./sidebar-state";

/** Static fallback shown while the session is resolved, with the sidebar folded as it was left. */
export function AppShellSkeleton() {
  const open = useSavedSidebarOpen();
  const item = open ? "w-full" : "w-8";

  return (
    <div className="flex min-h-svh w-full" aria-busy>
      <div
        className={cn(
          "hidden shrink-0 flex-col gap-4 border-r bg-sidebar md:flex",
          open ? "w-64 p-3" : "w-12 items-center px-2 py-3",
        )}
      >
        <Skeleton className={cn("h-10", item)} />
        <Skeleton className={cn("h-8", item)} />
        <div className={cn("mt-auto flex flex-col gap-2", !open && "items-center")}>
          <Skeleton className={cn("h-8", item)} />
          <Skeleton className={cn(open ? "h-12" : "h-8", item)} />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="h-14 border-b md:hidden" />
        <div className="flex flex-col gap-4 p-4 md:p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full max-w-2xl" />
        </div>
      </div>
    </div>
  );
}
