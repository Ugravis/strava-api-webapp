import { useTranslations } from "next-intl";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BadgeMetric, DistanceBadge, DistanceFamily } from "@/lib/api/types";
import { BadgeGrid } from "./badge-grid";
import { useAmount } from "./use-amount";

/** Sports of a section, or the challenges, which are not tied to a sport. */
export type SectionKind = DistanceFamily | "challenges";

interface DistanceFamilySectionProps {
  kind: SectionKind;
  /** Metric and cumulated amount shown in the header, where the section counts a single metric. */
  total: { metric: BadgeMetric; amount: number } | null;
  badges: DistanceBadge[];
  onOpen: (badgeId: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  highlightedId: string | null;
}

/** Rows shown while folded: 4 on phones, 3 from `sm`, 2 from `md`, twelve badges each time. */
const FOLDED_ROWS = { 3: 4, 4: 3, 6: 2 } as const;

/** Badges of a family of sports, or the challenges, with the amount accumulated where a single metric is shown. */
export function DistanceFamilySection({ kind, total, badges, ...grid }: DistanceFamilySectionProps) {
  const t = useTranslations("distances");
  const amount = useAmount();
  const headingId = `distances-${kind}`;
  const title = kind === "challenges" ? t("challengesTitle") : t(`families.${kind}`);

  return (
    <section aria-labelledby={headingId}>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 id={headingId}>{title}</h2>
          </CardTitle>
          {total && (
            <CardAction className="text-sm text-muted-foreground tabular-nums">
              {t(`totals.${total.metric}`, { amount: amount(total.metric, total.amount) })}
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <BadgeGrid badges={badges} rows={FOLDED_ROWS} showFavorite anchors {...grid} />
        </CardContent>
      </Card>
    </section>
  );
}
