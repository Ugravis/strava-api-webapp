import type { ReactNode } from "react";
import { formatDateTime, formatRelative } from "@/components/admin/data-table";
import { cn } from "@/lib/utils";

const TIMELINE_TONES = {
  default: "text-muted-foreground",
  green: "border-green-500/40 text-green-600 dark:text-green-400",
  red: "border-destructive/40 text-destructive",
  amber: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  blue: "border-blue-500/40 text-blue-600 dark:text-blue-400",
};

/** Dated events, the latest first, along a line. */
export function DetailTimeline({ children }: { children: ReactNode }) {
  return <ol className="relative flex flex-col gap-4 before:absolute before:inset-y-2 before:left-3 before:w-px before:-translate-x-1/2 before:bg-border">{children}</ol>;
}

/** An event of `DetailTimeline`: its icon on the line, a title, when (relative, exact on hover), and details. */
export function DetailTimelineItem({
  icon,
  tone = "default",
  title,
  date,
  now,
  children,
}: {
  icon: ReactNode;
  tone?: keyof typeof TIMELINE_TONES;
  title: ReactNode;
  /** ISO. */
  date: string;
  /** Fixed in demos, so that relative dates do not drift. */
  now?: number;
  children?: ReactNode;
}) {
  return (
    <li className="relative flex gap-3">
      <span className={cn("z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background [&_svg]:size-3.5", TIMELINE_TONES[tone])}>{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 text-sm font-medium">{title}</p>
          <time dateTime={date} title={formatDateTime(date)} className="shrink-0 text-xs text-muted-foreground">
            {formatRelative(date, now)}
          </time>
        </div>
        {children && <div className="text-sm text-muted-foreground">{children}</div>}
      </div>
    </li>
  );
}
