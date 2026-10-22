import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicProfileView } from "@/components/community/public-profile";
import { ProfileCardSkeleton } from "@/components/profile/profile-card";
import { CARD_WIDTH } from "@/components/profile/profile-stage";

interface UserPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)}` };
}

export default function UserPage({ params }: UserPageProps) {
  return (
    <div className="flex w-full flex-1 flex-col">
      <Suspense
        fallback={
          <div className={`m-auto ${CARD_WIDTH}`}>
            <ProfileCardSkeleton />
          </div>
        }
      >
        <UserProfile params={params} />
      </Suspense>
    </div>
  );
}

async function UserProfile({ params }: UserPageProps) {
  const { username } = await params;
  return <PublicProfileView username={decodeURIComponent(username).toLowerCase()} />;
}
