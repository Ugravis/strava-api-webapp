import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder for an admin page while it loads, below the section navigation. */
export default function AdminPageLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
