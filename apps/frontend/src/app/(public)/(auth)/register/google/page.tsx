import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GoogleSignupForm } from "@/components/auth/google-signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.googleSignup");
  return { title: t("title") };
}

export default function GoogleSignupPage() {
  return <GoogleSignupForm />;
}
