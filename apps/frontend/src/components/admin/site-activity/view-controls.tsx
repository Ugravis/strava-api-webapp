"use client";

import { ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, type ReactNode, type TransitionStartFunction, useContext, useOptimistic, useTransition } from "react";
import { Switch } from "@/components/ui/switch";

/** The transition of the view controls inside, shared so that the parts they change can show their skeletons. */
const ViewPendingContext = createContext<{ pending: boolean; startTransition: TransitionStartFunction } | null>(null);

/** Shares one transition between the view controls and the parts they change. */
export function ViewPendingProvider({ children }: { children: ReactNode }) {
  const [pending, startTransition] = useTransition();
  return <ViewPendingContext value={{ pending, startTransition }}>{children}</ViewPendingContext>;
}

/**
 * Shows `fallback` while a view control of the provider loads the page of its new choice:
 * a navigation is a transition, so React keeps the former content up until the new one is ready.
 */
export function ViewPending({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return useContext(ViewPendingContext)?.pending ? fallback : children;
}

/** The transition of the provider, else one of the control alone. */
function useViewTransition() {
  const [, own] = useTransition();
  return useContext(ViewPendingContext)?.startTransition ?? own;
}

/** A choice of the page among several, kept in the address: each option carries its own. */
export function ViewSelect({ label, options }: { label: string; options: { key: string; label: string; href: string; current: boolean }[] }) {
  const router = useRouter();
  const startTransition = useViewTransition();
  // Shown at once, while the page of the new choice loads behind its skeletons.
  const [current, setCurrent] = useOptimistic(options.find((option) => option.current)?.key);
  return (
    <span className="relative inline-flex">
      <select
        aria-label={label}
        value={current}
        onChange={(event) => {
          const option = options.find((entry) => entry.key === event.target.value);
          if (!option) return;
          startTransition(() => {
            setCurrent(option.key);
            router.push(option.href, { scroll: false });
          });
        }}
        className="h-8 cursor-pointer appearance-none rounded-lg border border-input bg-background py-1 pr-8 pl-2.5 text-xs font-medium shadow-xs transition-colors outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </span>
  );
}

/** A choice of the page turned on or off, kept in the address; the label tells what is on. */
export function ViewToggle({ label, checked, href }: { label: string; checked: boolean; href: string }) {
  const router = useRouter();
  const startTransition = useViewTransition();
  // Turned at once, while the page of the new choice loads behind its skeletons.
  const [on, setOn] = useOptimistic(checked);
  return (
    <label className="inline-flex h-8 cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground select-none">
      <Switch
        size="sm"
        checked={on}
        onCheckedChange={(next) =>
          startTransition(() => {
            setOn(next);
            router.push(href, { scroll: false });
          })
        }
      />
      {label}
    </label>
  );
}
