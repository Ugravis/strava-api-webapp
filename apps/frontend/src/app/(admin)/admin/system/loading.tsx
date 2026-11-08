import { SectionTitleSkeleton } from "@/components/admin/page-skeleton";
import { PageHeaderSkeleton } from "@/components/layout/page-header";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DatabaseSkeleton, UploadsSkeleton } from "./system-bits";

/** Placeholder of the maintenance page, in its layout: header, the two cards, the uploads, then the database. */
export default function AdminSystemLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <PageHeaderSkeleton width="w-40" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      <Separator />
      <section className="flex flex-col gap-3">
        <SectionTitleSkeleton description />
        <UploadsSkeleton />
      </section>
      <Separator />
      <section className="flex flex-col gap-3">
        <SectionTitleSkeleton description />
        <DatabaseSkeleton />
      </section>
    </div>
  );
}
