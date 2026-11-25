"use client";

import { ErrorView } from "@kilotrace/ui/components/error/error-view";
import { routes } from "@/config/routes";

/** An error of the map, or of the frame of the padded pages, beside the sidebar. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} embedded homeHref={routes.dashboard} />;
}
