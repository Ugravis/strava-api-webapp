"use client";

import { SearchXIcon, TriangleAlertIcon } from "lucide-react";
import { type ReactNode, useEffect, useEffectEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * While the detail loads, in the geometry of its blocks, so that nothing
 * jumps once it is there: `cover` (a `DetailCover`), the header and its
 * `media`, `actions` buttons (a `DetailActions`), then `sections`, the number
 * of fields of each (`fields` for a single one).
 */
export function DetailSkeleton({
  cover = false,
  media = true,
  actions = 0,
  fields = 6,
  sections = [fields],
}: {
  cover?: boolean;
  media?: boolean;
  actions?: number;
  fields?: number;
  sections?: number[];
}) {
  return (
    <div className="flex flex-col" aria-busy>
      {cover && <Skeleton className="h-40 w-full shrink-0 rounded-none" />}
      <div className="flex items-start gap-3 p-4">
        {media && <Skeleton className="size-12 shrink-0 rounded-full" />}
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      {actions > 0 && (
        <div className="flex gap-2 border-t px-4 py-3">
          {Array.from({ length: actions }, (_, index) => (
            <Skeleton key={index} className="h-8 flex-1" />
          ))}
        </div>
      )}
      {sections.map((count, section) => (
        <div key={section} className="flex flex-col gap-2 border-t p-4">
          <Skeleton className="my-0.5 h-3 w-20" />
          <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4">
            {Array.from({ length: count }, (_, index) => (
              <div key={index} className="col-span-2 grid min-h-8 grid-cols-subgrid items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className={cn("h-4", index % 2 ? "w-32" : "w-44")} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Nothing to show: the row is gone, or the call failed. */
export function DetailEmpty({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      {icon && <span className="flex size-10 items-center justify-center rounded-full bg-muted [&_svg]:size-5">{icon}</span>}
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

/**
 * Loads the detail of `id`, then draws it: the skeleton meanwhile, an empty
 * state when the row is gone, a retry when the call fails. Back to the
 * skeleton for another id; a new `refreshKey` loads again in the background,
 * the detail shown until the answer, e.g. once its row changed in the table.
 */
export function DetailLoader<T>({
  id,
  load,
  refreshKey,
  skeleton = <DetailSkeleton />,
  children,
}: {
  id: string;
  load: (id: string) => Promise<T | null>;
  refreshKey?: unknown;
  skeleton?: ReactNode;
  children: (row: T) => ReactNode;
}) {
  const [answer, setAnswer] = useState<{ id: string; row?: T | null; error?: true } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const run = useEffectEvent((asked: string) => load(asked));
  useEffect(() => {
    let live = true;
    run(id).then(
      (row) => live && setAnswer({ id, row }),
      () => live && setAnswer({ id, error: true }),
    );
    return () => {
      live = false;
    };
  }, [id, refreshKey, attempt]);

  if (answer?.id !== id) return skeleton;
  if (answer.error) {
    return (
      <DetailEmpty
        icon={<TriangleAlertIcon className="text-destructive" />}
        title="Chargement impossible"
        description="L'API n'a pas répondu. Réessaie dans un instant."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAnswer(null);
              setAttempt((count) => count + 1);
            }}
          >
            Réessayer
          </Button>
        }
      />
    );
  }
  if (!answer.row) return <DetailEmpty icon={<SearchXIcon />} title="Introuvable" description="Cette ligne n'existe plus, ou le lien est erroné." />;
  return children(answer.row);
}
