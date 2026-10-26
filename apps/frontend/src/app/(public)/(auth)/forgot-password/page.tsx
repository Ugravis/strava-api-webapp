import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { routes } from "@/config/routes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgotPassword");
  return { title: t("title") };
}

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");

  return (
    <AuthCard
      title={t("title")}
      description={t("description")}
      footer={
        <Link href={routes.login} className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("backToLogin")}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
