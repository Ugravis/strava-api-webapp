import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthCard } from "@kilotrace/ui/components/auth/auth-card";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { LoginForm } from "@/components/auth/login-form";
import { routes } from "@/config/routes";
import { emailSignInEnabled } from "@/lib/system/status";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("title") };
}

export default async function LoginPage() {
  const t = await getTranslations("auth.login");
  const email = await emailSignInEnabled();

  return (
    <AuthCard
      title={t("title")}
      description={t("description")}
      footer={
        <p>
          {t("noAccount")}{" "}
          <Link href={routes.register} className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("registerLink")}
          </Link>
        </p>
      }
    >
      <GoogleSignIn separator={email} />
      {email && (
        <Suspense>
          <LoginForm />
        </Suspense>
      )}
    </AuthCard>
  );
}
