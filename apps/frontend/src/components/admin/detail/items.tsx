import type { ReactNode } from "react";
import { Tip } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";

/** Several values of one field, one per line: in a `DetailField`, or alone in a section. */
export function DetailItems({ children }: { children: ReactNode }) {
  return <ul className="flex w-full min-w-0 flex-col text-sm">{children}</ul>;
}

/** A value of `DetailItems`: an icon in a grey square, as in the icon cells of the tables, its text, and its buttons on the right. */
export function DetailItem({ icon, actions, children }: { icon?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-h-8 min-w-0 items-center gap-2">
      {icon && <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted [&_svg]:size-3.5">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {actions && <span className="flex shrink-0 items-center gap-0.5">{actions}</span>}
    </li>
  );
}

/** An icon button of the `actions` of a `DetailItem`, named in a bubble. */
export function DetailItemButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Tip label={label}>
      <Button variant="ghost" size="icon-xs" aria-label={label} disabled={disabled} onClick={onClick}>
        {children}
      </Button>
    </Tip>
  );
}
