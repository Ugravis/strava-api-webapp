import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DetailFieldButton } from "./field-buttons";

/** Several values of one field, one per line: in a `DetailField`, or alone in a section. */
export function DetailItems({ children }: { children: ReactNode }) {
  return <ul className="flex w-full min-w-0 flex-col text-sm">{children}</ul>;
}

/**
 * A value of `DetailItems`: an icon in a grey square, as in the icon cells of
 * the tables, its text, and its buttons on the right. `pill`: the icon and
 * the text in a pill instead, e.g. a tag. `floating`: the buttons shown on
 * hover or focus only, as the floating buttons of the fields (always on a
 * screen without hover).
 */
export function DetailItem({ icon, actions, pill, floating, children }: { icon?: ReactNode; actions?: ReactNode; pill?: boolean; floating?: boolean; children: ReactNode }) {
  return (
    <li className="group/item flex min-h-8 min-w-0 items-center gap-2">
      {pill ? (
        <span className="inline-flex h-6 min-w-0 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium [&_svg]:size-3.5 [&_svg]:shrink-0">
          {icon}
          <span className="truncate">{children}</span>
        </span>
      ) : (
        <>
          {icon && <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted [&_svg]:size-3.5">{icon}</span>}
          <span className="min-w-0 flex-1 truncate">{children}</span>
        </>
      )}
      {actions && (
        <span
          className={cn(
            "flex shrink-0 items-center gap-1",
            floating && "opacity-0 transition-opacity group-focus-within/item:opacity-100 group-hover/item:opacity-100 [@media(hover:none)]:opacity-100",
          )}
        >
          {actions}
        </span>
      )}
    </li>
  );
}

/**
 * An icon button of the `actions` of a `DetailItem`, always in sight, in the
 * look of the floating buttons of the fields, named in a bubble. It changes
 * the field (unlink, remove), which is marked modifiable, unless `modifies={false}`.
 */
export function DetailItemButton({ modifies = true, ...props }: { label: string; disabled?: boolean; modifies?: boolean; onClick: () => void; children: ReactNode }) {
  return <DetailFieldButton {...props} modifies={modifies} />;
}
