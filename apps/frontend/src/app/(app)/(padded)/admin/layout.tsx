import { AdminRole } from "@kilotrace/shared/admin";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionNav } from "@/components/layout/section-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminRole } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminNavFor } from "@/lib/admin/navigation";
import AdminPageLoading from "./loading";

// Never indexed; the section is also left out of robots.txt and the sitemap,
// which would disclose it.
export const metadata: Metadata = {
  title: getAdminTranslations("layout")("title"),
  robots: { index: false, follow: false },
};

/**
 * Back office, rendered on the server only. The proxy already answers the
 * 404 of an unknown page to anyone without a role; the check is repeated
 * here, as on every page.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 sm:py-4">
      <Suspense fallback={<AdminSkeleton />}>
        <AdminFrame>{children}</AdminFrame>
      </Suspense>
    </div>
  );
}

async function AdminFrame({ children }: { children: React.ReactNode }) {
  const roles = await requireAdminRole(AdminRole.Support);
  const nav = getAdminTranslations("nav");
  const items = adminNavFor(roles).map((item) => ({ href: item.href, label: nav(item.key) }));

  return (
    <>
      <SectionNav items={items} label={getAdminTranslations("layout")("navigation")} />
      {children}
    </>
  );
}

function AdminSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-40 rounded-full" />
      <AdminPageLoading />
    </>
  );
}
