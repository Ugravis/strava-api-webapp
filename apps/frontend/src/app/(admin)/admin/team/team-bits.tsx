import "server-only";
import type { AdminRole } from "@kilotrace/shared/admin";
import { CrownIcon, KeyRoundIcon, type LucideIcon, ShieldIcon } from "lucide-react";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";

const ROLE_COLORS: Record<AdminRole, string> = {
  support: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  admin: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "super-admin": "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

const ROLE_ICONS: Record<AdminRole, LucideIcon> = {
  support: ShieldIcon,
  admin: KeyRoundIcon,
  "super-admin": CrownIcon,
};

/** A role, what it grants and how many members hold it. */
export function RoleSummary({ role, count }: { role: AdminRole; count: number }) {
  const t = getAdminTranslations("team");
  const Icon = ROLE_ICONS[role];
  return (
    <div className="flex items-start gap-3 rounded-xl border p-3">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", ROLE_COLORS[role])}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="flex items-baseline gap-2 text-sm font-medium">
          {getAdminTranslations("roles")(role)}
          <span className="text-xs font-normal text-muted-foreground">{t("count", { count })}</span>
        </p>
        <p className="text-xs text-muted-foreground">{t(`roleHints.${role}`)}</p>
      </div>
    </div>
  );
}
