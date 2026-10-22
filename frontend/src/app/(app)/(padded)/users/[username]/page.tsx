import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicProfileSkeleton, PublicProfileView } from "@/components/community/public-profile";

interface UserPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)}` };
}

export default function UserPage({ params }: UserPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-2 sm:py-4">
      <Suspense fallback={<PublicProfileSkeleton />}>
        <UserProfile params={params} />
      </Suspense>
    </div>
  );
}

async function UserProfile({ params }: UserPageProps) {
  const { username } = await params;
  return <PublicProfileView username={decodeURIComponent(username).toLowerCase()} />;
}
