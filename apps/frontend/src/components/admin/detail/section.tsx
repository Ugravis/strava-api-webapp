import type { ReactNode } from "react";
import { PILL_TONES, type Tone } from "@/components/admin/data-table";
import { cn } from "@/lib/utils";

const TONES = {
  default: "",
  danger: "bg-destructive/5",
};

/** A pill right after the title of a section: an icon, a text, or both. */
export interface DetailSectionPill {
  icon?: ReactNode;
  label?: string;
  tone?: Tone;
}

/**
 * A part of the detail under a small title, `pill` right after it (e.g.
 * « Modération »), `aside` on its right (e.g. a link). Stacked with a line between.
 */
export function DetailSection({
  title,
  pill,
  aside,
  tone = "default",
  className,
  children,
}: {
  title?: ReactNode;
  pill?: DetailSectionPill;
  aside?: ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-2 border-t p-4 first:border-t-0", TONES[tone], className)}>
      {(title || aside) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 items-center gap-2">
            {title && <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>}
            {pill && (
              <span
                className={cn(
                  "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium [&_svg]:size-3",
                  PILL_TONES[pill.tone ?? "gray"],
                )}
              >
                {pill.icon}
                {pill.label}
              </span>
            )}
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
