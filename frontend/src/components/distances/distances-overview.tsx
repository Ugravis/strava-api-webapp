"use client";

import { CircleAlertIcon, InfoIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { pinnedBadges, useDistances } from "@/hooks/use-distances";
import type { DistanceFamily } from "@/lib/api/types";
import { BadgeDialog } from "./badge-dialog";
import { DistanceFamilySection } from "./distance-family-section";
import { DistancesSkeleton } from "./distances-skeleton";
import { PinnedBadgesSection } from "./pinned-badges-section";

/** Display order of the families. */
const FAMILIES: DistanceFamily[] = ["all", "run", "hike", "ride"];

export function DistancesOverview() {
  const t = useTranslations("distances");
  const { overview, error, refresh, setPinned, reorderPins } = useDistances();
  // The badge stays set while the dialog closes, for its exit animation.
  const [openBadgeId, setOpenBadgeId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const pinned = useMemo(() => pinnedBadges(overview?.badges ?? []), [overview]);

  const openBadge = (badgeId: string) => {
    setOpenBadgeId(badgeId);
    setDialogOpen(true);
  };

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
    <div className="flex flex-col gap-4">
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
      <PinnedBadgesSection badges={pinned} onOpen={openBadge} onReorder={reorderPins} />
      {FAMILIES.map((family) => (
        <DistanceFamilySection
          key={family}
          family={family}
          totalM={overview.totals[family]}
          badges={overview.badges.filter((badge) => badge.family === family)}
          onOpen={openBadge}
        />
      ))}
      <BadgeDialog
        badge={overview.badges.find((badge) => badge.id === openBadgeId) ?? null}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onPinnedChange={setPinned}
      />
    </div>
  );
}
