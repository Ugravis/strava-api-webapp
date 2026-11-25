"use client";

import { ErrorView } from "@kilotrace/ui/components/error/error-view";
import { routes } from "@/config/routes";

/** An error of a signed-in page, beside the sidebar and above the footer. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} embedded homeHref={routes.dashboard} />;
}
