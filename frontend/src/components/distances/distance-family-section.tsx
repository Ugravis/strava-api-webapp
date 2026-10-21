import { useFormatter, useTranslations } from "next-intl";
import type { DistanceBadge, DistanceFamily } from "@/lib/api/types";
import { BadgeGrid } from "./badge-grid";
import type { BadgeView } from "./badge-view";

interface DistanceFamilySectionProps {
  family: DistanceFamily;
  totalM: number;
  badges: DistanceBadge[];
  view: BadgeView;
  onOpen: (badgeId: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  highlightedId: string | null;
}

/** Rows shown while folded, for each view and breakpoint. */
const FOLDED_ROWS = {
  cards: { base: 4, sm: 3, md: 3, lg: 2, xl: 2 },
  compact: { base: 6, sm: 4, md: 3, lg: 3, xl: 2 },
} as const;

/** Badges of a family of sports, with the distance it accumulates. */
export function DistanceFamilySection({ family, totalM, badges, view, ...grid }: DistanceFamilySectionProps) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const headingId = `distances-${family}`;
  // Badges obtained at least once: further iterations do not count.
  const obtained = badges.filter((badge) => badge.completions > 0).length;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 id={headingId} className="text-base font-semibold">
            {t(`families.${family}`)}
          </h2>
          <span
            className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums"
            title={t("obtainedLabel", { obtained, count: badges.length })}
          >
            <span aria-hidden>{`${obtained} / ${badges.length}`}</span>
            <span className="sr-only">{t("obtainedLabel", { obtained, count: badges.length })}</span>
          </span>
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {t("familyTotal", {
            distance: format.number(totalM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 0 }),
          })}
        </span>
      </div>
      <BadgeGrid
        badges={badges}
        layout={view === "cards" ? "card" : "compact"}
        rows={FOLDED_ROWS[view]}
        showFavorite
        anchors
        {...grid}
      />
    </section>
  );
}
