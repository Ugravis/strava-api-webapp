import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { RegisterForm } from "@/components/auth/register-form";
import { SignupsGate } from "@/components/auth/signups-gate";
import { routes } from "@/config/routes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("title") };
}

export default function RegisterPage() {
  const t = useTranslations("auth.register");

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
        <RegisterForm />
      </AuthCard>
    </SignupsGate>
  );
}
