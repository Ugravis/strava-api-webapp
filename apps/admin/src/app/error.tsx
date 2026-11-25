"use client";

import { ErrorView } from "@kilotrace/ui/components/error/error-view";

/** The entry of the back office, which opens on its dashboard. */
const HOME = "/";

/** An error thrown while rendering a page, inside the root layout. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} variant="admin" homeHref={HOME} />;
}
