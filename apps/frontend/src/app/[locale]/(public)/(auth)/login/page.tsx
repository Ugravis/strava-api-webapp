import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";
import { Suspense } from "react";
import { AuthCard } from "@kilotrace/ui/components/auth/auth-card";
import { EmailSignInGate } from "@/components/auth/email-sign-in-gate";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { LoginForm } from "@/components/auth/login-form";
import { routes } from "@/config/routes";

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const t = await getTranslations({ locale: await pageLocale(params), namespace: "auth.login" });
  return { title: t("title") };
}

export default async function LoginPage({ params }: LocaleProps) {
  await pageLocale(params);
  const t = await getTranslations("auth.login");

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
      <GoogleSignIn />
      <EmailSignInGate>
        <Suspense>
          <LoginForm />
        </Suspense>
      </EmailSignInGate>
    </AuthCard>
  );
}
