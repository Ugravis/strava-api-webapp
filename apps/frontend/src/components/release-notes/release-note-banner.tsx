"use client";

import type { PublicReleaseNote } from "@kilotrace/shared";
import { MegaphoneIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** The latest note missed, above the pages: its title or summary, and how many more there are. */
export function ReleaseNoteBanner({ notes, onOpen, onClose }: { notes: PublicReleaseNote[]; onOpen: () => void; onClose: () => void }) {
  const t = useTranslations("releaseNotes.banner");
  const [latest] = notes;
  if (!latest) return null;
  const text = latest.title?.trim() || latest.summary?.trim() || t("fallback", { version: latest.version });

  return (
    <div
      role="status"
      className="flex shrink-0 items-center gap-2 border-b border-violet-500/25 bg-violet-500/10 px-4 py-2 text-sm text-violet-950 dark:text-violet-100"
    >
      <MegaphoneIcon className="size-4 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden />
      <p className="min-w-0 flex-1">
        <span className="font-medium">{t("label")} v{latest.version}</span>
        <span className="mx-1.5 text-violet-900/50 dark:text-violet-200/50" aria-hidden>·</span>
        <span>{text}</span>
        {notes.length > 1 && <span className="text-violet-900/70 dark:text-violet-200/70"> {t("more", { count: notes.length - 1 })}</span>}
        <button type="button" className="ml-2 font-medium underline underline-offset-4 hover:no-underline" onClick={onOpen}>
          {t("open")}
        </button>
      </p>
      <Button
        variant="ghost"
        size="icon-xs"
        className="-my-0.5 text-current hover:bg-violet-500/15"
        aria-label={t("close")}
        title={t("close")}
        onClick={onClose}
      >
        <XIcon />
      </Button>
    </div>
  );
}
