import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicProfileView } from "@/components/community/public-profile";
import { ProfileCardSkeleton } from "@/components/profile/profile-card";

interface UserPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)}` };
}

export default function UserPage({ params }: UserPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 py-4">
      <Suspense fallback={<ProfileCardSkeleton />}>
        <UserProfile params={params} />
      </Suspense>
    </div>
  );
}

async function UserProfile({ params }: UserPageProps) {
  const { username } = await params;
  return <PublicProfileView username={decodeURIComponent(username).toLowerCase()} />;
}
