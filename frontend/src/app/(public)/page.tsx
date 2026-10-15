import Link from "next/link";
import { useTranslations } from "next-intl";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export default function LandingPage() {
  const t = useTranslations("landing");

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
        {t("title")}
      </h1>
      <p className="max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
        {t("description")}
      </p>
      <div className="mt-4 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button size="lg" className="sm:min-w-40" nativeButton={false} render={<Link href={routes.login} />}>
          {t("login")}
        </Button>
        <GoogleSignInButton className="sm:min-w-40">{t("withGoogle")}</GoogleSignInButton>
      </div>
    </section>
  );
}
