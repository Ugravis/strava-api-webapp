import { Skeleton } from "@kilotrace/ui/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-28 w-full max-w-md" />
    </div>
  );
}
