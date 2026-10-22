"use client";

import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTileActivities } from "@/hooks/use-tile-activities";
import type { TileZoom } from "@/lib/tiles/tile-geometry";
import { TileActivityItem } from "./tile-activity-item";

interface TileActivityListProps {
  zoom: TileZoom;
  x: number;
  y: number;
  onOpenActivity: (activityId: string) => void;
}

/** Every activity that crossed a tile, the latest ones first, a few at a time. */
export function TileActivityList({ zoom, x, y, onOpenActivity }: TileActivityListProps) {
  const t = useTranslations("map.tilePanel");
  const { items, hasMore, loading, error, loadMore } = useTileActivities(zoom, x, y);

  if (items === null) {
    return error ? (
      <ListError onRetry={loadMore} />
    ) : (
      <ul className="flex flex-col" aria-busy>
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="flex flex-col gap-2 py-2.5">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-48" />
          </li>
        ))}
      </ul>
    );
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground">{t("noActivities")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col">
        {items.map((activity) => (
          <TileActivityItem key={activity.id} activity={activity} onOpen={onOpenActivity} />
        ))}
      </ul>
      {error ? (
        <ListError onRetry={loadMore} />
      ) : (
        hasMore && (
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loading} className="w-full">
            {loading && <Loader2Icon className="animate-spin" aria-hidden />}
            {t("loadMore")}
          </Button>
        )
      )}
    </div>
  );
}

function ListError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("map.tilePanel");
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-muted-foreground">{t("activitiesError")}</p>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}
