"use client";

import { CrownIcon, type LucideIcon, RocketIcon, ShieldCheckIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import type { Distinction, DistinctionKind } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { ShowcaseDialog } from "./showcase-dialog";

/** Shown in this order, the rarest first. */
const ORDER: DistinctionKind[] = ["founder", "team", "early_member"];

const ICONS: Record<DistinctionKind, { icon: LucideIcon; color: string }> = {
  founder: { icon: CrownIcon, color: "text-amber-500" },
  team: { icon: ShieldCheckIcon, color: "text-blue-500" },
  early_member: { icon: RocketIcon, color: "text-red-500" },
};

/** Badges of the membership, each opening its details. */
export function Distinctions({ distinctions }: { distinctions: Distinction[] }) {
  const t = useTranslations("profile.distinctions");
  const format = useFormatter();
  const [open, setOpen] = useState<Distinction | null>(null);

  if (distinctions.length === 0) return null;
  return (
    <>
      <ul className="flex flex-wrap gap-1.5" aria-label={t("label")}>
        {distinctions.toSorted((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)).map((distinction) => (
          <li key={distinction.kind}>
            <button
              type="button"
              onClick={() => setOpen(distinction)}
              aria-haspopup="dialog"
              className="flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Emblem kind={distinction.kind} className="size-3.5" />
              {t(`${distinction.kind}.name`)}
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <ShowcaseDialog
          open
          onOpenChange={(next) => !next && setOpen(null)}
          media={
            <span className="grid size-20 place-items-center rounded-full bg-muted">
              <Emblem kind={open.kind} className="size-9" />
            </span>
          }
          title={t(`${open.kind}.name`)}
          subtitle={t("awarded", { date: format.dateTime(new Date(open.awardedAt), { dateStyle: "long" }) })}
          description={t(`${open.kind}.description`)}
        />
      )}
    </>
  );
}

function Emblem({ kind, className }: { kind: DistinctionKind; className?: string }) {
  const { icon: Icon, color } = ICONS[kind];
  return <Icon className={cn("shrink-0", color, className)} strokeWidth={1.75} aria-hidden />;
}
