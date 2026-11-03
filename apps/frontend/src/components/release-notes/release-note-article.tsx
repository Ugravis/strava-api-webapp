"use client";

import { type PublicReleaseNote, RELEASE_NOTE_SECTIONS, type ReleaseNoteSection } from "@kilotrace/shared";
import { InfoIcon, type LucideIcon, SparklesIcon, TrendingUpIcon, WrenchIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Markdown } from "@/components/markdown/markdown";
import { cn } from "@/lib/utils";

/** The look of each part of a note. */
export const RELEASE_NOTE_SECTION_LOOKS: Record<ReleaseNoteSection, { icon: LucideIcon; className: string }> = {
  new: { icon: SparklesIcon, className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  improved: { icon: TrendingUpIcon, className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  fixed: { icon: WrenchIcon, className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  other: { icon: InfoIcon, className: "bg-muted text-muted-foreground" },
};

/** A pill of the version, e.g. « v0.3.0 ». */
export function ReleaseVersionPill({ version, className }: { version: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full bg-primary/10 px-2 font-mono text-xs font-medium text-primary", className)}>
      v{version}
    </span>
  );
}

/** The parts of a note that have something to say, each under its icon and title. */
export function ReleaseNoteSections({ note }: { note: Pick<PublicReleaseNote, "sections"> }) {
  const t = useTranslations("releaseNotes.sections");
  const parts = RELEASE_NOTE_SECTIONS.filter((section) => note.sections[section]?.trim());
  if (parts.length === 0) return null;
  return (
    <div className="flex flex-col gap-5">
      {parts.map((section) => {
        const { icon: Icon, className } = RELEASE_NOTE_SECTION_LOOKS[section];
        return (
          <section key={section} className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <span className={cn("grid size-6 place-items-center rounded-md", className)}>
                <Icon className="size-3.5" aria-hidden />
              </span>
              {t(section)}
            </h3>
            <div className="pl-8 text-sm text-foreground/90">
              <Markdown source={note.sections[section]!} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** A whole note, as the history shows it: version, date, title, summary, then its parts. */
export function ReleaseNoteArticle({ note, latest }: { note: PublicReleaseNote; latest?: boolean }) {
  const t = useTranslations("releaseNotes");
  const format = useFormatter();
  return (
    <article id={`v${note.version}`} className="flex scroll-mt-24 flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <ReleaseVersionPill version={note.version} />
          {latest && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">{t("latest")}</span>}
          <time dateTime={note.releasedAt}>{t("releasedOn", { date: format.dateTime(new Date(note.releasedAt), { dateStyle: "long" }) })}</time>
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{note.title?.trim() || t("version", { version: note.version })}</h2>
        {note.summary && <p className="text-muted-foreground">{note.summary}</p>}
      </header>
      <ReleaseNoteSections note={note} />
    </article>
  );
}
