import { NotFoundView } from "@kilotrace/ui/components/error/not-found-view";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { PaddedFrame } from "@/components/layout/padded-frame";
import { PublicFrame } from "@/components/layout/public-frame";
import { routes } from "@/config/routes";
import { getCurrentUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("errorPages.notFound");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** Any unknown address, and every `notFound()`: in the frame of the app when signed in, of the public site otherwise. */
export default function NotFound() {
  return (
    <Suspense fallback={null}>
      <FramedNotFound />
    </Suspense>
  );
}

async function FramedNotFound() {
  // An unreachable API must not turn a 404 into an error: the public frame then.
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return (
      <PublicFrame>
        <NotFoundView embedded homeHref={routes.home} />
      </PublicFrame>
    );
  }
  return (
    <AppShell>
      <PaddedFrame>
        <NotFoundView embedded homeHref={routes.dashboard} />
      </PaddedFrame>
    </AppShell>
  );
}
