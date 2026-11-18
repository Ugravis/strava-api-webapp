"use client";

import { type PublicReleaseNote, RELEASE_NOTE_SECTIONS, type ReleaseNoteSection, TEAM_RELEASE_NOTE_SECTION } from "@kilotrace/shared";
import { CirclePlusIcon, InfoIcon, LockIcon, type LucideIcon, ShieldIcon, TrendingUpIcon, WrenchIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Fragment } from "react";
import { Markdown } from "@kilotrace/ui/components/markdown/markdown";
import { Separator } from "@kilotrace/ui/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@kilotrace/ui/components/ui/tooltip";
import { cn } from "@kilotrace/ui/lib/utils";

/** The look of each part of a note. */
export const RELEASE_NOTE_SECTION_LOOKS: Record<ReleaseNoteSection, { icon: LucideIcon; className: string }> = {
  new: { icon: CirclePlusIcon, className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  improved: { icon: TrendingUpIcon, className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  fixed: { icon: WrenchIcon, className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  other: { icon: InfoIcon, className: "bg-muted text-muted-foreground" },
  team: { icon: ShieldIcon, className: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
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

/**
 * The parts of a note that have something to say, each under its icon and
 * title, a line between them. `teamClassName` stretches the ground of the team
 * part to the edges of its frame, its text kept in line with the others.
 */
export function ReleaseNoteSections({ note, teamClassName }: { note: Pick<PublicReleaseNote, "sections">; teamClassName?: string }) {
  const t = useTranslations("releaseNotes.sections");
  const parts = RELEASE_NOTE_SECTIONS.filter((section) => note.sections[section]?.trim());
  if (parts.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {parts.map((section, index) => {
        const { icon: Icon, className } = RELEASE_NOTE_SECTION_LOOKS[section];
        // Only the back-office team gets it: set apart on a pale yellow ground.
        const team = section === TEAM_RELEASE_NOTE_SECTION;
        return (
          <Fragment key={section}>
            {index > 0 && !team && <Separator />}
            <section
              className={cn(
                "flex flex-col gap-2",
                team && cn("-mx-3 rounded-lg bg-amber-50 px-3 py-3 text-amber-950 dark:bg-amber-400/10 dark:text-amber-50", teamClassName),
              )}
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span className={cn("grid size-6 place-items-center rounded-md", className)}>
                  <Icon className="size-3.5" aria-hidden />
                </span>
                {t(section)}
                {team && (
                  <Tooltip>
                    <TooltipTrigger
                      delay={200}
                      aria-label={t("teamHint")}
                      render={<button type="button" className="ml-auto rounded-sm text-amber-700 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 dark:text-amber-300" />}
                    >
                      <LockIcon className="size-3.5" aria-hidden />
                    </TooltipTrigger>
                    <TooltipContent>{t("teamHint")}</TooltipContent>
                  </Tooltip>
                )}
              </h3>
              <div className={cn("text-sm", team ? "text-amber-950/90 dark:text-amber-50/90" : "text-foreground/90")}>
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
