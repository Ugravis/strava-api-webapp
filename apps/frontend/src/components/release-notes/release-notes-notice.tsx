"use client";

import type { UnseenReleaseNotesResponse } from "@kilotrace/shared";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { routes } from "@/config/routes";
import { releaseNotesService } from "@/services/release-notes.service";
import { ReleaseNoteBanner } from "./release-note-banner";
import { ReleaseNoteDialog } from "./release-note-dialog";

/**
 * The notes of the versions the user missed, once per visit: together in a
 * popup or a banner, after the strongest display among them; the
 * notification alone says the rest. Seen once closed, whichever way.
 */
export function ReleaseNotesNotice() {
  const pathname = usePathname();
  const [unseen, setUnseen] = useState<UnseenReleaseNotesResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // The history marks its notes seen itself.
    if (pathname === routes.releaseNotes) return;
    let cancelled = false;
    releaseNotesService
      .getUnseen()
      .then((response) => {
        if (cancelled || response.notes.length === 0) return;
        setUnseen(response);
        setDialogOpen(response.display === "popup");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Once per visit: kept by the layout across navigations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!unseen || unseen.display === "notification" || unseen.display === "none") return null;

  const dismiss = () => {
    setDialogOpen(false);
    setUnseen(null);
    void releaseNotesService.markSeen(unseen.notes.map(({ version }) => version)).catch(() => undefined);
  };

  return (
    <>
      {unseen.display === "banner" && <ReleaseNoteBanner notes={unseen.notes} onOpen={() => setDialogOpen(true)} onClose={dismiss} />}
      <ReleaseNoteDialog
        notes={unseen.notes}
        open={dialogOpen}
        onOpenChange={(open) => (open ? setDialogOpen(true) : dismiss())}
        historyHref={routes.releaseNotes}
      />
    </>
  );
}
