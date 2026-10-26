import { cn } from "@/lib/utils";

/** Faint tile grid fading out from the top, as a nod to the map. Place it in a `relative isolate` parent. */
export function GridBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(70%_60%_at_50%_0%,black,transparent)] opacity-60",
        className,
      )}
    />
  );
}
