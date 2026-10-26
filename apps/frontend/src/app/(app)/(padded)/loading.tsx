import { Skeleton } from "@kilotrace/ui/components/skeleton";

/** Placeholder for page content while it loads, inside the persistent shell. */
export default function AppPageLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-2 sm:py-4" aria-busy>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
