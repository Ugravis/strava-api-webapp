"use client";

import { CircleAlertIcon, InfoIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { useDistances } from "@/hooks/use-distances";
import type { DistanceFamily } from "@/lib/api/types";
import { DistanceFamilySection } from "./distance-family-section";
import { DistancesSkeleton } from "./distances-skeleton";

/** Display order of the families. */
const FAMILIES: DistanceFamily[] = ["all", "run", "hike", "ride"];

export function DistancesOverview() {
  const t = useTranslations("distances");
  const { overview, error, refresh } = useDistances();

  if (!overview) {
    return error ? (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertDescription>{t("error")}</AlertDescription>
        <AlertAction>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            <RefreshCwIcon />
            {t("retry")}
          </Button>
        </AlertAction>
      </Alert>
    ) : (
      <DistancesSkeleton />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {overview.totals.all === 0 && (
        <Alert>
          <InfoIcon />
          <AlertDescription>
            <Link href={routes.dashboard} className="underline underline-offset-4">
              {t("empty")}
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {FAMILIES.map((family) => (
        <DistanceFamilySection
          key={family}
          family={family}
          totalM={overview.totals[family]}
          landmarks={overview.landmarks.filter((landmark) => landmark.family === family)}
        />
      ))}
    </div>
  );
}
