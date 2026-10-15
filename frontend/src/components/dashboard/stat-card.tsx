import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  /** Null while loading. */
  value: string | null;
  icon: LucideIcon;
}

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="size-4" aria-hidden />
          {label}
        </p>
        {value === null ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
