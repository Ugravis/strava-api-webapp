"use client";

import { CircleAlertIcon, InfoIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { ACHIEVEMENT_TAB_METRICS, type AchievementTab } from "@/config/achievement-tabs";
import { favoriteBadges, useDistances } from "@/hooks/use-distances";
import type { DistanceBadge, DistanceFamily } from "@/lib/api/types";
import { CHALLENGE_METRICS } from "@/lib/badge-amount";
import { BadgeDialog } from "./badge-dialog";
import { BadgeSearch } from "./badge-search";
import { DistanceFamilySection, type SectionKind } from "./distance-family-section";
import { DistancesSkeleton } from "./distances-skeleton";
import { FavoriteBadgesSection } from "./favorite-badges-section";
import { ALL_THEMES, ThemeTabs } from "./theme-tabs";

/** Display order of the families. */
const FAMILIES: DistanceFamily[] = ["all", "run", "hike", "ride"];

/** Display order of the sections: the families of sports, then the challenges. */
const SECTIONS: SectionKind[] = [...FAMILIES, "challenges"];

/** The section of a badge: the sports it counts, or the challenges. */
const sectionOf = (badge: DistanceBadge): SectionKind =>
  CHALLENGE_METRICS.includes(badge.metric) ? "challenges" : badge.family;

/** How long a badge found by the search stays outlined once its details are closed. */
const HIGHLIGHT_MS = 2500;

/** Longest wait for the page to scroll to a badge found by the search. */
const SCROLL_TIMEOUT_MS = 800;

/** The badge of the families, the one the search scrolls to and focuses back. */
const anchorOf = (badgeId: string) =>
  document.querySelector<HTMLElement>(`[data-badge-anchor="${CSS.escape(badgeId)}"]`);

export function DistancesOverview({ tab }: { tab: AchievementTab }) {
  const t = useTranslations("distances");
  const { overview, error, refresh, setFavorite, reorderFavorites } = useDistances();
  const [theme, setTheme] = useState(ALL_THEMES);
  const [expanded, setExpanded] = useState<ReadonlySet<SectionKind>>(new Set());
  // The badge stays set while the dialog closes, for its exit animation.
  const [openBadgeId, setOpenBadgeId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  /** Badge picked in the search: the page scrolls to it, then opens it. */
  const [searchedId, setSearchedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimer = useRef<number | undefined>(undefined);

  const metrics = ACHIEVEMENT_TAB_METRICS[tab];
  /** Badges of the tab. */
  const tabBadges = useMemo(
    () => (overview?.badges ?? []).filter((badge) => metrics.includes(badge.metric)),
    [overview, metrics],
  );
  const favorites = useMemo(() => favoriteBadges(tabBadges), [tabBadges]);

  const openBadge = (badgeId: string) => {
    setOpenBadgeId(badgeId);
    setDialogOpen(true);
  };

  const onDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open && highlightedId) {
      window.clearTimeout(highlightTimer.current);
      highlightTimer.current = window.setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
    }
  };

  const pickSearched = (badgeId: string) => {
    const badge = tabBadges.find((candidate) => candidate.id === badgeId);
    if (!badge) return;
    // The badge is shown in its section, unfolded, whatever the theme picked.
    if (theme !== ALL_THEMES && badge.themeId !== theme) setTheme(ALL_THEMES);
    setExpanded((current) => new Set(current).add(sectionOf(badge)));
    window.clearTimeout(highlightTimer.current);
    setHighlightedId(badgeId);
    setSearchedId(badgeId);
  };

  // Once the badge searched is rendered: centered in the page, then opened.
  useEffect(() => {
    if (!searchedId) return;
    const element = anchorOf(searchedId);
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      setSearchedId(null);
      setOpenBadgeId(searchedId);
      setDialogOpen(true);
    };
    const rect = element?.getBoundingClientRect();
    const offset = rect ? rect.top + rect.height / 2 - window.innerHeight / 2 : 0;
    const timer = window.setTimeout(open, Math.abs(offset) < 40 ? 0 : SCROLL_TIMEOUT_MS);
    if (element && Math.abs(offset) >= 40) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.addEventListener("scrollend", open, { once: true });
      element.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    }
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scrollend", open);
    };
  }, [searchedId]);

  useEffect(() => () => window.clearTimeout(highlightTimer.current), []);

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

  // A theme with no badge in this tab is not offered, and would otherwise filter everything out.
  const themes = overview.themes.filter((candidate) => tabBadges.some((badge) => badge.themeId === candidate.id));
  const activeTheme = themes.some((candidate) => candidate.id === theme) ? theme : ALL_THEMES;
  const shown = activeTheme === ALL_THEMES ? tabBadges : tabBadges.filter((badge) => badge.themeId === activeTheme);
  /** Where the tab counts a single metric, its total is shown in the sections of sports. */
  const singleMetric = metrics.length === 1 ? metrics[0] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <BadgeSearch badges={tabBadges} onPick={pickSearched} />
        {themes.length > 0 && <ThemeTabs themes={themes} value={activeTheme} onValueChange={setTheme} />}
      </div>
      {overview.totals.activities.all === 0 && (
        <Alert>
          <InfoIcon />
          <AlertDescription>
            <Link href={routes.dashboard} className="underline underline-offset-4">
              {t("empty")}
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {activeTheme === ALL_THEMES && (
        <FavoriteBadgesSection
          badges={favorites}
          onOpen={openBadge}
          onReorder={reorderFavorites}
          highlightedId={highlightedId}
        />
      )}
      {SECTIONS.map((kind) => {
        const badges = shown.filter((badge) => sectionOf(badge) === kind);
        return (
          badges.length > 0 && (
            <DistanceFamilySection
              key={kind}
              kind={kind}
              total={
                singleMetric && kind !== "challenges"
                  ? { metric: singleMetric, amount: overview.totals[singleMetric][kind] }
                  : null
              }
              badges={badges}
              onOpen={openBadge}
              expanded={expanded.has(kind)}
              onExpandedChange={(open) =>
                setExpanded((current) => {
                  const next = new Set(current);
                  if (open) next.add(kind);
                  else next.delete(kind);
                  return next;
                })
              }
              highlightedId={highlightedId}
            />
          )
        );
      })}
      <BadgeDialog
        badge={overview.badges.find((badge) => badge.id === openBadgeId) ?? null}
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        onFavoriteChange={setFavorite}
        // Opened from the search, the focus goes back to the badge, not to the search field.
        finalFocus={
          highlightedId ? () => anchorOf(highlightedId)?.querySelector<HTMLElement>("button") ?? null : undefined
        }
      />
    </div>
  );
}
