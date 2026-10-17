import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileHeader } from "@/components/profile/profile-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title") };
}

export default function ProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-2 sm:py-4">
      <ProfileHeader />
    </div>
  );
}
