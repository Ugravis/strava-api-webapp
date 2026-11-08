"use client";

import type { PublicReleaseNote } from "@kilotrace/shared";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ReactNode, type RefObject, useRef, useState } from "react";
import { Button } from "@kilotrace/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@kilotrace/ui/components/ui/dialog";
import { ReleaseNoteCover, ReleaseNoteMeta, ReleaseNoteSections } from "./release-note-article";

/**
 * The inside of the popup: the version and its title on a tinted band, its
 * parts scrolled, then `footer`. `framed` in a dialog, whose title and
 * description it names; else drawn alone, e.g. in a preview.
 */
export function ReleaseNoteCard({ note, footer, framed = false }: { note: PublicReleaseNote; footer: ReactNode; framed?: boolean }) {
  const t = useTranslations("releaseNotes");
  const title = note.title?.trim() || t("version", { version: note.version });
  const Title = framed ? DialogTitle : "h2";
  const Description = framed ? DialogDescription : "p";
  return (
    <>
      <ReleaseNoteCover url={note.bannerUrl} className="border-b" />
      <div className="flex flex-col gap-2 border-b px-5 pt-5 pb-4">
        <ReleaseNoteMeta note={note} className={framed ? "pr-8" : undefined} />
        <Title className="text-lg leading-snug font-semibold">{title}</Title>
        <Description className={note.summary ? "text-sm text-muted-foreground" : "sr-only"}>{note.summary || title}</Description>
      </div>
      <div className="max-h-[min(60vh,32rem)] overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-width:thin]">
        <ReleaseNoteSections note={note} />
      </div>
      <div className="flex flex-col-reverse items-center gap-2 border-t bg-muted/50 px-5 py-3 sm:flex-row sm:justify-between">{footer}</div>
    </>
  );
}

/** The arrows between the notes missed, the latest first. */
function Pager({ index, count, onChange }: { index: number; count: number; onChange: (index: number) => void }) {
  const t = useTranslations("releaseNotes.dialog");
  if (count < 2) return <span />;
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Button variant="ghost" size="icon-sm" aria-label={t("next")} title={t("next")} disabled={index === 0} onClick={() => onChange(index - 1)}>
        <ChevronLeftIcon />
      </Button>
      <span className="tabular-nums">{t("position", { index: index + 1, count })}</span>
      <Button variant="ghost" size="icon-sm" aria-label={t("previous")} title={t("previous")} disabled={index === count - 1} onClick={() => onChange(index + 1)}>
        <ChevronRightIcon />
      </Button>
    </div>
  );
}

/** The buttons of the popup: the arrows, the history, « C'est noté ». */
export function ReleaseNoteFooter({
  index,
  count,
  onIndexChange,
  onDone,
  historyHref,
  doneRef,
}: {
  index: number;
  count: number;
  onIndexChange: (index: number) => void;
  onDone: () => void;
  historyHref?: string;
  /** Focused as the popup opens: the parts above stay scrolled to their top. */
  doneRef?: RefObject<HTMLButtonElement | null>;
}) {
  const t = useTranslations("releaseNotes.dialog");
  return (
    <>
      <Pager index={index} count={count} onChange={onIndexChange} />
      <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
        {historyHref && (
          <Button variant="ghost" nativeButton={false} render={<Link href={historyHref} onClick={onDone} />}>
            {t("history")}
          </Button>
        )}
        <Button ref={doneRef} onClick={onDone}>
          {t("done")}
        </Button>
      </div>
    </>
  );
}

/**
 * The notes of the versions the user missed, one at a time with arrows
 * between them. `historyHref`: a link to every note.
 */
export function ReleaseNoteDialog({
  notes,
  open,
  onOpenChange,
  historyHref,
}: {
  notes: PublicReleaseNote[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyHref?: string;
}) {
  const [index, setIndex] = useState(0);
  const doneRef = useRef<HTMLButtonElement>(null);
  const note = notes[Math.min(index, notes.length - 1)];
  if (!note) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg" initialFocus={doneRef}>
        <ReleaseNoteCard
          framed
          note={note}
          footer={<ReleaseNoteFooter index={index} count={notes.length} onIndexChange={setIndex} onDone={() => onOpenChange(false)} historyHref={historyHref} doneRef={doneRef} />}
        />
      </DialogContent>
    </Dialog>
  );
}
