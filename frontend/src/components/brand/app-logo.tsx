import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

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

interface AppLogoProps {
  className?: string;
  /** Shows only the mark on small screens, where space is scarce. */
  compact?: boolean;
}

export function AppLogo({ className, compact = false }: AppLogoProps) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      <AppLogoMark />
      <span className={cn("truncate", compact && "sr-only sm:not-sr-only")}>
        {siteConfig.name}
      </span>
    </span>
  );
}
