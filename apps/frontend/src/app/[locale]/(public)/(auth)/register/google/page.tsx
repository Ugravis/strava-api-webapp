import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";
import { GoogleSignupForm } from "@/components/auth/google-signup-form";
import { SignupsGate } from "@/components/auth/signups-gate";

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const t = await getTranslations({ locale: await pageLocale(params), namespace: "auth.googleSignup" });
  return { title: t("title") };
}

export default async function GoogleSignupPage({ params }: LocaleProps) {
  await pageLocale(params);
  return (
    <SignupsGate>
      <GoogleSignupForm />
    </SignupsGate>
  );
}
