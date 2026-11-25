"use client";

import { ErrorView } from "@kilotrace/ui/components/error/error-view";
import { routes } from "@/config/routes";

/** An error of a public page, between the navbar and the footer. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} embedded homeHref={routes.home} />;
}
