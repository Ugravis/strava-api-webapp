"use client";

import { TriangleAlertIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Maintenance notice above the pages. Closed for the visit only: kept by
 * the layout across navigations, shown again on a reload.
 */
export function MaintenanceBanner({ title, description }: { title: string; description: string | null }) {
  const t = useTranslations("maintenance");
  const id = useId();
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  if (!open) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex shrink-0 items-start gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-200"
    >
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p>
          <span className="font-medium">{title}</span>
          {description && (
            <button
              type="button"
              className="ml-2 underline underline-offset-4 hover:no-underline"
              aria-expanded={expanded}
              aria-controls={id}
              onClick={() => setExpanded((value) => !value)}
            >
              {t(expanded ? "less" : "more")}
            </button>
          )}
        </p>
        {description && expanded && (
          <p id={id} className="mt-1 whitespace-pre-line text-amber-900/80 dark:text-amber-200/80">
            {description}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        className="-my-0.5 text-current hover:bg-amber-500/15"
        aria-label={t("close")}
        title={t("close")}
        onClick={() => setOpen(false)}
      >
        <XIcon />
      </Button>
    </div>
  );
}
