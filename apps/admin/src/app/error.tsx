"use client";

import { ErrorView } from "@kilotrace/ui/components/error/error-view";
import { ADMIN_INDEX } from "@/lib/admin/entry";

/** An error of the frame of the back office, or of its sign-in: full screen. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} variant="admin" homeHref={ADMIN_INDEX} />;
}
