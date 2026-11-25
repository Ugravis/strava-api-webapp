"use client";

import { ErrorView } from "@kilotrace/ui/components/error/error-view";
import { routes } from "@/config/routes";

/** An error of a layout of the site, out of the frames of its pages: full screen. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} homeHref={routes.home} />;
}
