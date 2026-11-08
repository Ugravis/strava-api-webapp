"use client";

import { hasReleaseNoteContent, type PublicReleaseNote, type ReleaseNoteDisplay } from "@kilotrace/shared";
import { BellIcon, HistoryIcon, type LucideIcon, MegaphoneIcon, PanelTopIcon, SquareStackIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ReleaseNoteArticle } from "@kilotrace/ui/components/release-notes/release-note-article";
import { ReleaseNoteBanner } from "@kilotrace/ui/components/release-notes/release-note-banner";
import { ReleaseNoteCard, ReleaseNoteFooter } from "@kilotrace/ui/components/release-notes/release-note-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@kilotrace/ui/components/ui/dialog";
import { UnderlineTabs } from "@kilotrace/ui/components/ui/underline-tabs";
import { DISPLAYS } from "./release-note-bits";

type Surface = "popup" | "banner" | "notification" | "history";

const SURFACES: { id: Surface; label: string }[] = [
  { id: "popup", label: "Popup" },
  { id: "banner", label: "Bandeau" },
  { id: "notification", label: "Notification" },
  { id: "history", label: "Historique" },
];

const SURFACE_ICONS: Record<Surface, LucideIcon> = {
  popup: SquareStackIcon,
  banner: PanelTopIcon,
  notification: BellIcon,
  history: HistoryIcon,
};

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
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-3 sm:max-w-2xl">
        <DialogHeader className="gap-1">
          <DialogTitle>Aperçu de la v{note.version}</DialogTitle>
          <DialogDescription className="text-xs">
            {DISPLAYS[note.display].label}
            {empty ? " · note vide, rien ne sera montré" : " · rien n'est envoyé ni compté comme vu"}
          </DialogDescription>
        </DialogHeader>
        <UnderlineTabs
          value={surface}
          label="Surface"
          icons={SURFACE_ICONS}
          onValueChange={setSurface}
          tabs={SURFACES.map(({ id, label }) => ({ id, label, dimmed: !shown.includes(id) }))}
        />
        <p className="text-xs text-muted-foreground">{HINTS[surface](note.display, shown.includes(surface))}</p>
        <div className="-mx-4 -mb-4 min-h-0 flex-1 overflow-y-auto px-4 pb-4 [scrollbar-width:thin]">
          {surface === "popup" && (
            <div className="mx-auto w-full max-w-lg overflow-hidden rounded-xl border bg-popover text-sm shadow-sm">
              <ReleaseNoteCard note={note} footer={<ReleaseNoteFooter index={0} count={1} onIndexChange={() => undefined} onDone={() => undefined} historyHref="#" />} />
            </div>
          )}
          {surface === "banner" && (
            <div className="overflow-hidden rounded-lg border">
              <ReleaseNoteBanner notes={[note]} onOpen={() => setSurface("popup")} onClose={() => undefined} />
              <div className="flex flex-col gap-2 p-4" aria-hidden>
                <div className="h-3 w-1/3 rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
            </div>
          )}
          {surface === "notification" && <NotificationMock version={note.version} />}
          {surface === "history" && <ReleaseNoteArticle note={note} latest />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** What each surface is, and whether the users get it with the display of the note. */
const HINTS: Record<Surface, (display: ReleaseNoteDisplay, shown: boolean) => string> = {
  popup: (display, shown) => (display === "banner" ? "Ouverte par « Voir les nouveautés » du bandeau." : shown ? "À l'ouverture du site, une fois par note." : "Non montrée avec cet affichage."),
  banner: (_, shown) => (shown ? "Au-dessus des pages, jusqu'à sa fermeture." : "Non montré avec cet affichage."),
  notification: (_, shown) => (shown ? "Dans la cloche ; un clic mène à l'historique." : "Non envoyée avec cet affichage."),
  history: () => "La page « Nouveautés », pour tous les utilisateurs.",
};

/** The item of the bell, as the users read it. */
function NotificationMock({ version }: { version: string }) {
  const t = useTranslations("notifications");
  return (
    <div className="mx-auto w-full max-w-sm rounded-xl border bg-popover p-1">
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
