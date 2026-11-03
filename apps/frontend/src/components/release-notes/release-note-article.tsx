"use client";

import { type PublicReleaseNote, RELEASE_NOTE_SECTIONS, type ReleaseNoteSection } from "@kilotrace/shared";
import { CirclePlusIcon, InfoIcon, type LucideIcon, TrendingUpIcon, WrenchIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Fragment } from "react";
import { Markdown } from "@/components/markdown/markdown";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/** The look of each part of a note. */
export const RELEASE_NOTE_SECTION_LOOKS: Record<ReleaseNoteSection, { icon: LucideIcon; className: string }> = {
  new: { icon: CirclePlusIcon, className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  improved: { icon: TrendingUpIcon, className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  fixed: { icon: WrenchIcon, className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  other: { icon: InfoIcon, className: "bg-muted text-muted-foreground" },
};

/** The image across the top of a note, in a wide frame whatever its size. */
export function ReleaseNoteCover({ url, className }: { url: string | null; className?: string }) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element -- served by the API, already sized.
  return <img src={url} alt="" className={cn("aspect-[3/1] w-full object-cover", className)} />;
}

/** « Nouveautés » on the left, « 25 octobre 2026 · v0.2.0 » on the right. */
export function ReleaseNoteMeta({ note, className }: { note: Pick<PublicReleaseNote, "version" | "releasedAt">; className?: string }) {
  const t = useTranslations("releaseNotes");
  const format = useFormatter();
  return (
    <p className={cn("flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs", className)}>
      <span className="font-semibold tracking-wide text-primary uppercase">{t("title")}</span>
      <span className="text-muted-foreground tabular-nums">
        <time dateTime={note.releasedAt}>{format.dateTime(new Date(note.releasedAt), { dateStyle: "long" })}</time> · v{note.version}
      </span>
    </p>
  );
}

/** The parts of a note that have something to say, each under its icon and title, a line between them. */
export function ReleaseNoteSections({ note }: { note: Pick<PublicReleaseNote, "sections"> }) {
  const t = useTranslations("releaseNotes.sections");
  const parts = RELEASE_NOTE_SECTIONS.filter((section) => note.sections[section]?.trim());
  if (parts.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {parts.map((section, index) => {
        const { icon: Icon, className } = RELEASE_NOTE_SECTION_LOOKS[section];
        return (
          <Fragment key={section}>
            {index > 0 && <Separator />}
            <section className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span className={cn("grid size-6 place-items-center rounded-md", className)}>
                  <Icon className="size-3.5" aria-hidden />
                </span>
                {t(section)}
              </h3>
              <div className="text-sm text-foreground/90">
                <Markdown source={note.sections[section]!} highlight />
              </div>
            </section>
          </Fragment>
        );
      })}
    </div>
  );
}

/** A whole note, as the history shows it: date and version, title, summary, then its parts. */
export function ReleaseNoteArticle({ note, latest }: { note: PublicReleaseNote; latest?: boolean }) {
  const t = useTranslations("releaseNotes");
  return (
    <article id={`v${note.version}`} className="flex scroll-mt-24 flex-col gap-4">
      <ReleaseNoteCover url={note.bannerUrl} className="rounded-xl border" />
      <header className="flex flex-col gap-2">
        <ReleaseNoteMeta note={note} />
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
          {note.title?.trim() || t("version", { version: note.version })}
          {latest && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">{t("latest")}</span>}
        </h2>
        {note.summary && <p className="text-muted-foreground">{note.summary}</p>}
      </header>
      <ReleaseNoteSections note={note} />
    </article>
  );
}
