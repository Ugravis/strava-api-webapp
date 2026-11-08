import type { AdminAuthProviders } from "@kilotrace/shared/admin";
import { GoogleIcon } from "@kilotrace/ui/components/auth/google-icon";
import { AuthCard } from "@kilotrace/ui/components/auth/auth-card";
import { GridBackdrop } from "@kilotrace/ui/components/layout/grid-backdrop";
import { Button } from "@kilotrace/ui/components/ui/button";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";
import type { Metadata } from "next";
import { Suspense } from "react";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: getAdminTranslations("login")("title") };

const ERRORS = ["refused", "google", "unavailable"] as const;

/** Sign-in of the back office, for the members of the team only. */
export default function AdminLoginPage({ searchParams }: PageProps<"/login">) {
  const t = getAdminTranslations("login");

  return (
    <div className="relative isolate flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
      <GridBackdrop />
      <div className="w-full max-w-sm">
        <AuthCard title={t("title")} description={t("description")}>
          <Suspense fallback={<LoginSkeleton />}>
            <LoginMethods searchParams={searchParams} />
          </Suspense>
        </AuthCard>
      </div>
    </div>
  );
}

async function LoginMethods({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const t = getAdminTranslations("login");
  const [{ error }, providers] = await Promise.all([
    searchParams,
    adminApi<AdminAuthProviders>("/auth/providers").catch(() => null),
  ]);
  const shown = ERRORS.find((code) => code === error) ?? (providers?.ok ? undefined : "unavailable");
  const { google = false, email = false } = providers?.ok ? providers.data : {};

  return (
    <>
      {shown && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {t(`errors.${shown}`)}
        </p>
      )}
      {google && (
        <Button variant="outline" size="lg" nativeButton={false} render={<a href="/auth/google" />}>
          <GoogleIcon className="size-4" />
          {t("google")}
        </Button>
      )}
      {google && email && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase">
          <span className="h-px flex-1 bg-border" />
          {t("or")}
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
      {email && (
        <LoginForm
          labels={{ email: t("email"), password: t("password"), rememberMe: t("rememberMe"), submit: t("submit") }}
        />
      )}
      {providers?.ok && !google && !email && <p className="text-center text-sm text-muted-foreground">{t("unavailable")}</p>}
    </>
  );
}

function LoginSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
