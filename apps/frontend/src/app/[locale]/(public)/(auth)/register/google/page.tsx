import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GoogleSignupForm } from "@/components/auth/google-signup-form";
import { SignupsGate } from "@/components/auth/signups-gate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.googleSignup");
  return { title: t("title") };
}

export default function GoogleSignupPage() {
  return (
    <SignupsGate>
      <GoogleSignupForm />
    </SignupsGate>
  );
}
