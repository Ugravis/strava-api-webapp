"use client";

import { StarIcon, StarOffIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBadgeDetails } from "@/hooks/use-badge-details";
import type { DistanceBadge } from "@/lib/api/types";
import { BadgeBanner } from "./badge-banner";
import { BadgeFacts } from "./badge-facts";
import { BadgeHistory } from "./badge-history";
import { useAmount } from "./use-amount";
import { BadgeProgressBar } from "./badge-progress-bar";
import { FamilyIcon } from "./family-icon";

interface BadgeDialogProps {
  /** Kept while the dialog closes, for its exit animation. */
  badge: DistanceBadge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFavoriteChange: (badge: DistanceBadge, favorite: boolean) => Promise<void>;
  /** Element focused once closed; by default the one focused before opening. */
  finalFocus?: () => HTMLElement | null;
}

/** Details of a badge, centered over the page. */
export function BadgeDialog({ badge, open, onOpenChange, onFavoriteChange, finalFocus }: BadgeDialogProps) {
  return (
    <Dialog open={open && badge !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        finalFocus={finalFocus ? () => finalFocus() ?? true : undefined}
        // One column no wider than the dialog: long activity names get truncated instead of widening it.
        className="max-h-[calc(100dvh-2rem)] grid-cols-1 gap-0 overflow-x-hidden overflow-y-auto p-0 sm:max-w-md"
      >
        {badge && <BadgeDialogBody key={badge.id} badge={badge} onFavoriteChange={onFavoriteChange} />}
      </DialogContent>
    </Dialog>
  );
}

function BadgeDialogBody({
  badge,
  onFavoriteChange,
}: Pick<BadgeDialogProps, "onFavoriteChange"> & { badge: DistanceBadge }) {
  const t = useTranslations("distances");
  const amount = useAmount();
  const { details, error } = useBadgeDetails(badge.id);
  const [pending, setPending] = useState(false);
  const favorite = badge.favoritePosition !== null;

  const toggleFavorite = () => {
    setPending(true);
    onFavoriteChange(badge, !favorite)
      .catch(() => toast.error(t("dialog.favoriteError")))
      .finally(() => setPending(false));
  };

  return (
    <>
      <BadgeBanner badge={badge} />
      <DialogClose
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2 bg-black/20 text-white hover:bg-black/35 hover:text-white"
          />
        }
      >
        <XIcon />
        <span className="sr-only">{t("dialog.close")}</span>
      </DialogClose>
      <div className="flex flex-col gap-5 p-4">
        <DialogHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">
              <FamilyIcon family={badge.family} data-icon="inline-start" aria-hidden />
              {t(`families.${badge.family}`)}
            </Badge>
            <Badge variant="outline" className="tabular-nums">
              {amount(badge.metric, badge.goal)}
            </Badge>
          </div>
          <DialogTitle className="text-lg">{badge.name}</DialogTitle>
          <DialogDescription className="leading-relaxed">{badge.description}</DialogDescription>
        </DialogHeader>
        <BadgeProgressBar badge={badge} />
        <BadgeFacts badge={badge} details={details} error={error} />
        {badge.completions > 0 && <BadgeHistory details={details} error={error} />}
      </div>
      <DialogFooter className="mx-0 mb-0">
        <Button variant={favorite ? "outline" : "default"} onClick={toggleFavorite} disabled={pending} aria-pressed={favorite}>
          {favorite ? <StarOffIcon data-icon="inline-start" /> : <StarIcon data-icon="inline-start" />}
          {favorite ? t("dialog.removeFavorite") : t("dialog.addFavorite")}
        </Button>
      </DialogFooter>
    </>
  );
}
