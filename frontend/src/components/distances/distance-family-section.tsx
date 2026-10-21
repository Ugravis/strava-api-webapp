import { useTranslations } from "next-intl";
import type { BadgeMetric, DistanceBadge, DistanceFamily } from "@/lib/api/types";
import { BadgeGrid } from "./badge-grid";
import { useAmount } from "./use-amount";

/** Sports of a section, or the challenges, which are not tied to a sport. */
export type SectionKind = DistanceFamily | "challenges";

interface DistanceFamilySectionProps {
  kind: SectionKind;
  /** Cumulated amounts of the metrics the section counts, shown in its header. */
  totals: { metric: BadgeMetric; amount: number }[];
  badges: DistanceBadge[];
  /** Cards with the name only. */
  compact: boolean;
  onOpen: (badgeId: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  highlightedId: string | null;
}

/** Rows shown while folded, whatever the width. */
const FOLDED_ROWS = 3;

/** Badges of a family of sports, or the challenges, with the share obtained and the amounts accumulated. */
export function DistanceFamilySection({ kind, totals, badges, compact, ...grid }: DistanceFamilySectionProps) {
  const t = useTranslations("distances");
  const amount = useAmount();
  const headingId = `distances-${kind}`;
  const title = kind === "challenges" ? t("challengesTitle") : t(`families.${kind}`);
  const obtained = badges.filter((badge) => badge.completions > 0).length;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex min-h-8 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <h2 id={headingId} className="text-base font-semibold">
          {title}
        </h2>
        <span
          className="text-sm text-muted-foreground tabular-nums"
          aria-label={t("obtainedLabel", { obtained, total: badges.length })}
        >
          {t("obtained", { obtained, total: badges.length })}
        </span>
        {totals.length > 0 && (
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {totals.map(({ metric, amount: value }) => amount(metric, value, true)).join(" · ")}
          </span>
        )}
      </div>
      <BadgeGrid
        badges={badges}
        layout={compact ? "compact" : "horizontal"}
        rows={FOLDED_ROWS}
        showFavorite
        anchors
        {...grid}
      />
    </section>
  );
}
