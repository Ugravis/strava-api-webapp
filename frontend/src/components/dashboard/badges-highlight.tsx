"use client";

import { ChevronRightIcon, TrophyIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BadgeCard } from "@/components/distances/badge-card";
import { BadgeDialog } from "@/components/distances/badge-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { favoriteBadges, useDistances } from "@/hooks/use-distances";
import { closestBadges } from "@/lib/badge-sort";

/** Badges closest to completion shown without favorites. */
const CLOSEST_COUNT = 4;

/** Every favorite badge of the user, or else those closest to completion, opening their details. */
export function BadgesHighlight() {
  const t = useTranslations("dashboard.badges");
  const { overview, error, setFavorite, setOnProfile } = useDistances();
  const [openBadgeId, setOpenBadgeId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const favorites = overview ? favoriteBadges(overview.badges) : [];
  const mode = favorites.length > 0 ? "favorites" : "closest";
  const badges = mode === "favorites" ? favorites : closestBadges(overview?.badges ?? [], CLOSEST_COUNT);

  if (error && !overview) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <TrophyIcon className="size-4 text-muted-foreground" aria-hidden />
          {t(`${mode}.title`)}
        </CardTitle>
        <CardDescription>{t(`${mode}.description`)}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={routes.achievements} />}>
            {t("all")}
            <ChevronRightIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!overview ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy>
            {Array.from({ length: CLOSEST_COUNT }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {badges.map((badge, index) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                index={index}
                layout="horizontal"
                showFamily
                showKind
                onOpen={(badgeId) => {
                  setOpenBadgeId(badgeId);
                  setDialogOpen(true);
                }}
              />
            ))}
          </ul>
        )}
      </CardContent>
      {overview && (
        <BadgeDialog
          badge={overview.badges.find((badge) => badge.id === openBadgeId) ?? null}
          themes={overview.themes}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onFavoriteChange={setFavorite}
          onProfileChange={setOnProfile}
        />
      )}
    </Card>
  );
}
