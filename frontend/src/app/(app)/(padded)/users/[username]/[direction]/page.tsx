import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FollowsList } from "@/components/community/follows-list";
import { UserRowsSkeleton } from "@/components/community/user-row";
import type { FollowDirection } from "@/lib/api/types";

interface FollowsPageProps {
  params: Promise<{ username: string; direction: string }>;
}

const isDirection = (value: string): value is FollowDirection => value === "followers" || value === "following";

export async function generateMetadata({ params }: FollowsPageProps): Promise<Metadata> {
  const { username, direction } = await params;
  const t = await getTranslations("community.lists");
  return { title: isDirection(direction) ? `${t(direction)} · @${decodeURIComponent(username)}` : undefined };
}

export default function FollowsPage({ params }: FollowsPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-2 sm:py-4">
      <Suspense fallback={<UserRowsSkeleton />}>
        <UserFollows params={params} />
      </Suspense>
    </div>
  );
}

async function UserFollows({ params }: FollowsPageProps) {
  const { username, direction } = await params;
  if (!isDirection(direction)) notFound();
  return <FollowsList username={decodeURIComponent(username).toLowerCase()} direction={direction} />;
}
