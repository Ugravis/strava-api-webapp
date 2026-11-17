import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@kilotrace/ui/components/auth/auth-card";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { RegisterForm } from "@/components/auth/register-form";
import { SignupsGate } from "@/components/auth/signups-gate";
import { routes } from "@/config/routes";
import { emailSignInEnabled } from "@/lib/system/status";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("title") };
}

export default async function RegisterPage() {
  const t = await getTranslations("auth.register");
  const email = await emailSignInEnabled();

  return (
    <SignupsGate>
      <AuthCard
        title={t("title")}
        description={t("description")}
        footer={
          <p>
            {t("hasAccount")}{" "}
            <Link href={routes.login} className="font-medium text-foreground underline-offset-4 hover:underline">
              {t("loginLink")}
            </Link>
          </p>
        }
      >
        <GoogleSignIn separator={email} />
        {email && <RegisterForm />}
      </AuthCard>
    </SignupsGate>
  );
}
