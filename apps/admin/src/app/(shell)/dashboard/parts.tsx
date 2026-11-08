import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@kilotrace/ui/components/ui/card";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";
import { getAdminTranslations } from "@/lib/admin/messages";

interface DashboardCardProps {
  title: string;
  description?: ReactNode;
  /** The page the card sums up, linked from its header. */
  href?: string;
  className?: string;
  children: ReactNode;
}

/** A block of the dashboard: a title, a link to its page, then its content. */
export function DashboardCard({ title, description, href, className, children }: DashboardCardProps) {
  const t = getAdminTranslations("dashboard");
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {href && (
          <CardAction>
            <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t("seeAll")}
              <ArrowRightIcon className="size-3.5" aria-hidden />
            </Link>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
}

/** Stands for a card while its data loads. */
/** `chart` stands for a single tall block, as a chart. */
export function DashboardCardSkeleton({ rows = 4, chart = false, className }: { rows?: number; chart?: boolean; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {chart ? <Skeleton className="h-56 w-full" /> : Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-9 w-full" />)}
      </CardContent>
    </Card>
  );
}

/** Shown in place of a card whose call failed. */
export function DashboardUnavailable() {
  return <p className="text-sm text-muted-foreground">{getAdminTranslations("dashboard")("error")}</p>;
}
