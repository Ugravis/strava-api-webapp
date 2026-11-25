"use client";

import { ErrorView } from "@kilotrace/ui/components/error/error-view";
import { routes } from "@/config/routes";

/** An error thrown while rendering a page, inside the root layout. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} homeHref={routes.home} />;
}
