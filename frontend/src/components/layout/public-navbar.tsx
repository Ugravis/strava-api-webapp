import Link from "next/link";
import { useTranslations } from "next-intl";
import { AppLogo } from "@/components/brand/app-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export function PublicNavbar() {
  const t = useTranslations("navbar");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <Link href={routes.home} className="min-w-0">
          <AppLogo compact />
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button variant="ghost" nativeButton={false} render={<Link href={routes.login} />}>
            {t("login")}
          </Button>
          <Button nativeButton={false} render={<Link href={routes.register} />}>
            {t("register")}
          </Button>
        </div>
      </nav>
    </header>
  );
}
