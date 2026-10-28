import { Skeleton } from "@/components/ui/skeleton";
import { UploadsSkeleton } from "./system-bits";

/** Placeholder of the maintenance page, in its layout. */
export default function AdminSystemLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
      <UploadsSkeleton />
    </div>
  );
}

