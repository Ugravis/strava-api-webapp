import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

/** Stands for a `PageHeader` while its page loads: the same lines, the same gaps. */
export function PageHeaderSkeleton({ width = "w-48" }: { width?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className={cn("h-8", width)} />
      <Skeleton className="my-0.5 h-4 w-96 max-w-full" />
    </div>
  );
}
