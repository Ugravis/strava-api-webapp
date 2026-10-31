import type { ReactNode } from "react";

/** Several values of one field, one per line: in a `DetailField`, or alone in a section. */
export function DetailItems({ children }: { children: ReactNode }) {
  return <ul className="flex w-full min-w-0 flex-col">{children}</ul>;
}

/** A value of `DetailItems`: an icon or a picture, its text, and its buttons on the right. */
export function DetailItem({ icon, actions, children }: { icon?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-h-8 min-w-0 items-center gap-2">
      {icon && <span className="inline-flex shrink-0 [&_svg]:size-4">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {actions && <span className="flex shrink-0 items-center gap-0.5">{actions}</span>}
    </li>
  );
}
