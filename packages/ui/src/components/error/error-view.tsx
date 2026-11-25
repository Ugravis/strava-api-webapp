"use client";

import { HouseIcon, RotateCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import type { AppVariant } from "@kilotrace/ui/components/brand/app-logo";
import { Button } from "@kilotrace/ui/components/ui/button";
import { ErrorScene } from "./error-scene";

interface ErrorViewProps {
  error: Error & { digest?: string };
  /** Renders the failed segment again. */
  reset: () => void;
  variant?: AppVariant;
  homeHref: string;
}

/** The page of an unexpected error: try again, or go home. The digest ties it to the server logs. */
export function ErrorView({ error, reset, variant, homeHref }: ErrorViewProps) {
  const t = useTranslations("errorPages");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScene
      code="500"
      ghost={2}
      variant={variant}
      homeHref={homeHref}
      eyebrow={t("error.eyebrow")}
      title={t("error.title")}
      description={t("error.description")}
      actions={
        <>
          <Button size="lg" className="sm:min-w-44" onClick={reset}>
            <RotateCwIcon data-icon="inline-start" />
            {t("error.retry")}
          </Button>
          {/* A full load, the state of the app being what failed. */}
          <Button variant="outline" size="lg" className="sm:min-w-44" nativeButton={false} render={<a href={homeHref} />}>
            <HouseIcon data-icon="inline-start" />
            {t("home")}
          </Button>
        </>
      }
      footnote={error.digest ? t("error.reference", { digest: error.digest }) : undefined}
    />
  );
}
