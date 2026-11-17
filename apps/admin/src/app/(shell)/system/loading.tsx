import { PageHeaderSkeleton } from "@kilotrace/ui/components/layout/page-header";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";

/** Placeholder of the maintenance page, in its layout: header, then the banner and the three cards of the settings. */
export default function AdminSystemLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <PageHeaderSkeleton width="w-40" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
