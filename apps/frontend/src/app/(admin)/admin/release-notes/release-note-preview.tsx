"use client";

import { hasReleaseNoteContent, type PublicReleaseNote, type ReleaseNoteDisplay } from "@kilotrace/shared";
import { BellIcon, HistoryIcon, PanelTopIcon, MegaphoneIcon, SquareStackIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { ReleaseNoteArticle } from "@/components/release-notes/release-note-article";
import { ReleaseNoteBanner } from "@/components/release-notes/release-note-banner";
import { ReleaseNoteCard, ReleaseNoteFooter } from "@/components/release-notes/release-note-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DISPLAYS } from "./release-note-bits";

type Surface = "popup" | "banner" | "notification" | "history";

const SURFACES: { id: Surface; label: string; icon: ReactNode }[] = [
  { id: "popup", label: "Popup", icon: <SquareStackIcon /> },
  { id: "banner", label: "Bandeau", icon: <PanelTopIcon /> },
  { id: "notification", label: "Notification", icon: <BellIcon /> },
  { id: "history", label: "Historique", icon: <HistoryIcon /> },
];

const surfaceOf = (display: ReleaseNoteDisplay): Surface => (display === "none" ? "history" : display);

/** Which surfaces the users get with `display`: the others are previewed all the same, greyed in the picker. */
const SHOWN: Record<ReleaseNoteDisplay, Surface[]> = {
  popup: ["popup", "notification", "history"],
  banner: ["banner", "popup", "notification", "history"],
  notification: ["notification", "history"],
  none: ["history"],
};

/**
 * The note as the users will see it, on each of its surfaces, the one of
 * its display first. Nothing is marked seen, nothing sent.
 */
export function ReleaseNotePreview({ note, open, onOpenChange }: { note: PublicReleaseNote; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [surface, setSurface] = useState<Surface>(surfaceOf(note.display));
  const shown = SHOWN[note.display];
  const empty = !hasReleaseNoteContent(note);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Aperçu de la v{note.version}</DialogTitle>
          <DialogDescription>
            Affichage : {DISPLAYS[note.display].label.toLowerCase()}. {empty ? "La note est vide : rien ne sera montré." : "Rien n'est envoyé ni compté comme vu."}
          </DialogDescription>
        </DialogHeader>
        <div role="tablist" aria-label="Surface" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {SURFACES.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={surface === id}
              onClick={() => setSurface(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors [&_svg]:size-4",
                surface === id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                !shown.includes(id) && surface !== id && "opacity-50",
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        {!shown.includes(surface) && (
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            Avec cet affichage, les utilisateurs ne voient pas cette surface{surface === "popup" ? " d'eux-mêmes : seulement depuis le bouton du bandeau." : "."}
          </p>
        )}
        {surface === "banner" && note.display === "banner" && (
          <p className="text-xs text-muted-foreground">« Voir les nouveautés » ouvre la popup.</p>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border bg-muted/30 p-4 [scrollbar-width:thin] sm:p-6">
          {surface === "popup" && (
            <div className="mx-auto w-full max-w-lg overflow-hidden rounded-xl bg-popover text-sm shadow-lg ring-1 ring-foreground/10">
              <ReleaseNoteCard note={note} footer={<ReleaseNoteFooter index={0} count={1} onIndexChange={() => undefined} onDone={() => undefined} historyHref="#" />} />
            </div>
          )}
          {surface === "banner" && (
            <div className="overflow-hidden rounded-lg border bg-background">
              <ReleaseNoteBanner notes={[note]} onOpen={() => setSurface("popup")} onClose={() => undefined} />
              <div className="flex flex-col gap-2 p-4" aria-hidden>
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
                <div className="h-24 rounded-lg bg-muted" />
              </div>
            </div>
          )}
          {surface === "notification" && <NotificationMock version={note.version} />}
          {surface === "history" && (
            <div className="mx-auto w-full max-w-3xl rounded-xl bg-background p-5">
              <ReleaseNoteArticle note={note} latest />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The item of the bell, as the users read it. */
function NotificationMock({ version }: { version: string }) {
  const t = useTranslations("notifications");
  return (
    <div className="mx-auto w-full max-w-sm rounded-xl border bg-popover p-1 shadow-sm">
      <div className="flex items-start gap-3 rounded-md bg-rose-500/5 px-2 py-2 dark:bg-rose-500/10">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
          <MegaphoneIcon className="size-4" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm leading-snug">{t.rich("release_note", { version, b: (chunks) => <span className="font-semibold">{chunks}</span> })}</span>
          <span className="text-xs text-muted-foreground">à l&apos;instant</span>
        </span>
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-rose-500" aria-hidden />
      </div>
    </div>
  );
}
