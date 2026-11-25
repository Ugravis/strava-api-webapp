import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";
import { AuthCard } from "@kilotrace/ui/components/auth/auth-card";
import { EmailSignInGate } from "@/components/auth/email-sign-in-gate";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { RegisterForm } from "@/components/auth/register-form";
import { SignupsGate } from "@/components/auth/signups-gate";
import { routes } from "@/config/routes";

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const t = await getTranslations({ locale: await pageLocale(params), namespace: "auth.register" });
  return { title: t("title") };
}

export default async function RegisterPage({ params }: LocaleProps) {
  await pageLocale(params);
  const t = await getTranslations("auth.register");

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
        <GoogleSignIn />
        <EmailSignInGate>
          <RegisterForm />
        </EmailSignInGate>
      </AuthCard>
    </SignupsGate>
  );
}
