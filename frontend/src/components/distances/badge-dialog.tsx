"use client";

import { PinIcon, PinOffIcon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
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
import { BadgeProgressBar } from "./badge-progress-bar";

interface BadgeDialogProps {
  /** Kept while the dialog closes, for its exit animation. */
  badge: DistanceBadge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPinnedChange: (badge: DistanceBadge, pinned: boolean) => Promise<void>;
}

/** Details of a badge, centered over the page. */
export function BadgeDialog({ badge, open, onOpenChange, onPinnedChange }: BadgeDialogProps) {
  return (
    <Dialog open={open && badge !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        {badge && <BadgeDialogBody key={badge.id} badge={badge} onPinnedChange={onPinnedChange} />}
      </DialogContent>
    </Dialog>
  );
}

function BadgeDialogBody({
  badge,
  onPinnedChange,
}: Pick<BadgeDialogProps, "onPinnedChange"> & { badge: DistanceBadge }) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const { details, error } = useBadgeDetails(badge.id);
  const [pending, setPending] = useState(false);
  const pinned = badge.pinnedAt !== null;

  const togglePin = () => {
    setPending(true);
    onPinnedChange(badge, !pinned)
      .catch(() => toast.error(t("dialog.pinError")))
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
            <Badge variant="secondary">{t(`families.${badge.family}`)}</Badge>
            <Badge variant="outline" className="tabular-nums">
              {format.number(badge.distanceM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 })}
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
        <Button variant={pinned ? "outline" : "default"} onClick={togglePin} disabled={pending} aria-pressed={pinned}>
          {pinned ? <PinOffIcon data-icon="inline-start" /> : <PinIcon data-icon="inline-start" />}
          {pinned ? t("dialog.unpin") : t("dialog.pin")}
        </Button>
      </DialogFooter>
    </>
  );
}
