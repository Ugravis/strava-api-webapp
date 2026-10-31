import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder of the user tags, in the layout of the page: header, figures, then the table. */
export default function AdminUserTagsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-30 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
