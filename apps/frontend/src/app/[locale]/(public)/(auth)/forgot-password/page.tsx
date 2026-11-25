import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";
import { AuthCard } from "@kilotrace/ui/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { routes } from "@/config/routes";

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const t = await getTranslations({ locale: await pageLocale(params), namespace: "auth.forgotPassword" });
  return { title: t("title") };
}

export default async function ForgotPasswordPage({ params }: LocaleProps) {
  await pageLocale(params);
  const t = await getTranslations("auth.forgotPassword");

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
