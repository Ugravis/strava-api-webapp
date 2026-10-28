import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder of the badges, in the layout of the page. */
export default function AdminBadgesLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-4 w-24" />
      {Array.from({ length: 2 }, (_, section) => (
        <div key={section} className="flex flex-col gap-1.5">
          <Skeleton className="mb-1 h-5 w-40" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-[3.25rem] w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
