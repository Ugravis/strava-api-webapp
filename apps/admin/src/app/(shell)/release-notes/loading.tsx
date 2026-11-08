import { TablePageSkeleton } from "@/components/admin/page-skeleton";

/** Placeholder of the release notes, in the layout of the page: header, figures, then the table. */
export default function AdminReleaseNotesLoading() {
  return <TablePageSkeleton title="w-40" rows={6} />;
}
