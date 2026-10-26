import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.resetPassword");
  return { title: t("title") };
}

export default function ResetPasswordPage() {
  const t = useTranslations("auth.resetPassword");

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
