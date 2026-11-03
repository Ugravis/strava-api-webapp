"use client";

import type { PublicReleaseNote } from "@kilotrace/shared";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { releaseNotesService } from "@/services/release-notes.service";
import { ReleaseNoteArticle } from "./release-note-article";

/** Every published note, the latest first; read here, they count as seen. */
export function ReleaseNotesHistory() {
  const t = useTranslations("releaseNotes");
  const [notes, setNotes] = useState<PublicReleaseNote[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    releaseNotesService
      .getAll()
      .then(({ notes: loaded }) => {
        setNotes(loaded);
        if (loaded.length > 0) void releaseNotesService.markSeen(loaded.slice(0, 50).map(({ version }) => version)).catch(() => undefined);
      })
      .catch(() => setError(true));
  }, []);
  useEffect(load, [load]);
  const retry = () => {
    setError(false);
    load();
  };

  // A link to one note, e.g. from its notification: brought into sight once drawn.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    // The latest one is already at the top, under the title.
    if (notes && hash && hash !== `v${notes[0]?.version}`) document.getElementById(hash)?.scrollIntoView();
  }, [notes]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("error")}
        <Button variant="outline" size="sm" onClick={retry}>
          {t("retry")}
        </Button>
      </div>
    );
  }
  if (!notes) {
    return (
      <div className="flex flex-col gap-8" aria-busy>
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex flex-col gap-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }
  if (notes.length === 0) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  }
  return (
    <div className="flex flex-col gap-8">
      {notes.map((note, index) => (
        <Fragment key={note.version}>
          {index > 0 && <Separator />}
          <ReleaseNoteArticle note={note} latest={index === 0} />
        </Fragment>
      ))}
    </div>
  );
}
