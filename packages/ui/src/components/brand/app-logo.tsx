import { siteConfig } from "@kilotrace/ui/config/site";
import { cn } from "@kilotrace/ui/lib/utils";

export function AppLogoMark({ className }: { className?: string }) {
  const Logo = siteConfig.logo;
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className,
      )}
    >
      <Logo className="size-4" aria-hidden />
    </span>
  );
}

/** Part of the site a wordmark names: the public app or its back office. */
export type AppVariant = "site" | "admin";

/** The app name set as a bold italic uppercase wordmark; the back office has its own, its accent in blue. */
export function AppWordmark({ className, variant = "site" }: { className?: string; variant?: AppVariant }) {
  return (
    <span className={cn("truncate pr-[0.1em] font-wordmark leading-none font-extrabold tracking-wide uppercase italic", className)}>
      {variant === "admin" ? (
        <>
          {siteConfig.adminName.base}
          <span className="text-blue-600 dark:text-blue-400">{siteConfig.adminName.accent}</span>
        </>
      ) : (
        siteConfig.name
      )}
    </span>
  );
}

interface AppLogoProps {
  className?: string;
  /** Shows only the mark on small screens, where space is scarce. */
  compact?: boolean;
  variant?: AppVariant;
}

export function AppLogo({ className, compact = false, variant }: AppLogoProps) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      <AppLogoMark />
      <AppWordmark variant={variant} className={cn(compact && "sr-only sm:not-sr-only")} />
    </span>
  );
}
