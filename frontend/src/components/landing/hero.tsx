import Link from "next/link";
import { useTranslations } from "next-intl";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { GridBackdrop } from "@/components/layout/grid-backdrop";
import { StravaIcon } from "@/components/strava/strava-icon";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { HeroIllustration } from "./hero-illustration";

export function Hero() {
  const t = useTranslations("landing");

  return (
    <section className="relative isolate overflow-hidden">
      <GridBackdrop />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-12 pb-20 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pb-28">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <p className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
            <StravaIcon className="size-3.5 text-[#FC4C02]" />
            {t("heroBadge")}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">{t("title")}</h1>
          <p className="max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">{t("description")}</p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button size="lg" className="sm:min-w-44" nativeButton={false} render={<Link href={routes.register} />}>
              {t("start")}
            </Button>
            <GoogleSignInButton className="sm:min-w-44">{t("withGoogle")}</GoogleSignInButton>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("alreadyRegistered")}{" "}
            <Link href={routes.login} className="font-medium text-foreground underline underline-offset-4 hover:no-underline">
              {t("login")}
            </Link>
          </p>
        </div>
        <HeroIllustration />
      </div>
    </section>
  );
}
