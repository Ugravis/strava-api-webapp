import { PinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DistanceBadge } from "@/lib/api/types";
import { BadgeGrid } from "./badge-grid";

interface PinnedBadgesSectionProps {
  /** Pinned badges, in pin order. */
  badges: DistanceBadge[];
  onOpen: (badgeId: string) => void;
}

/** The favorite badges of the user, first on the page; a hint on how to pin when there is none. */
export function PinnedBadgesSection({ badges, onOpen }: PinnedBadgesSectionProps) {
  const t = useTranslations("distances.pinnedSection");
  const headingId = "distances-pinned";

  return (
    <section aria-labelledby={headingId}>
      <Card className={badges.length === 0 ? "border border-dashed bg-transparent ring-0" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PinIcon className="size-4 text-muted-foreground" aria-hidden />
            <h2 id={headingId}>{t("title")}</h2>
          </CardTitle>
          {badges.length === 0 && <CardDescription>{t("empty")}</CardDescription>}
        </CardHeader>
        {badges.length > 0 && (
          <CardContent>
            <BadgeGrid badges={badges} showPin={false} onOpen={onOpen} />
          </CardContent>
        )}
      </Card>
    </section>
  );
}
