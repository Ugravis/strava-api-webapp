import { NotFoundView } from "@kilotrace/ui/components/error/not-found-view";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AdminFrame } from "@/components/admin/shell/admin-frame";
import { getAdminMe } from "@/lib/admin/access";
import { adminRoutes } from "@/lib/admin/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("errorPages.notFound");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** Any unknown address, and every `notFound()`: inside the sidebar for a member of the team. */
export default function NotFound() {
  return (
    <Suspense fallback={null}>
      <FramedNotFound />
    </Suspense>
  );
}

async function FramedNotFound() {
  const me = await getAdminMe();
  if (!me) {
    return <NotFoundView variant="admin" homeHref={adminRoutes.index} />;
  }
  return (
    <AdminFrame roles={me.roles}>
      <NotFoundView variant="admin" embedded homeHref={adminRoutes.dashboard} />
    </AdminFrame>
  );
}
