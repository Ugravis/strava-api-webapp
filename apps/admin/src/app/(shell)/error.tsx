"use client";

import { ErrorView } from "@kilotrace/ui/components/error/error-view";
import { ADMIN_INDEX } from "@/lib/admin/entry";

/** An error of a page of the back office, inside its sidebar. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} variant="admin" embedded homeHref={ADMIN_INDEX} />;
}
