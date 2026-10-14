import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { LoginForm } from "@/components/auth/login-form";
import { routes } from "@/config/routes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("title") };
}

export default function LoginPage() {
  const t = useTranslations("auth.login");

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
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
