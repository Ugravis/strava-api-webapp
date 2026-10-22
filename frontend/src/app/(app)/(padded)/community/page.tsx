import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UserSearch } from "@/components/community/user-search";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("community");
  return { title: t("title") };
}

export default async function CommunityPage() {
  const t = await getTranslations("community");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-2 sm:py-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>
      <UserSearch />
    </div>
  );
}
