import { DashboardCardSkeleton } from "../dashboard/parts";

/** Stands for a tab while its section loads, in the rhythm of its rows. */
export function SiteActivityTabSkeleton() {
  return (
    <>
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DashboardCardSkeleton chart className="lg:col-span-2" />
          <DashboardCardSkeleton chart />
        </div>
      ))}
    </>
  );
}
