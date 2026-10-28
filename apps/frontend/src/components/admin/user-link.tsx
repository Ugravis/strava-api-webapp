import "server-only";
import type { AuditUser } from "@kilotrace/shared/admin";
import { PanelLink } from "@/components/admin/panel-link";
import { UserAvatar } from "@/components/user/user-avatar";
import { adminRoutes } from "@/lib/admin/navigation";

const PANEL_PREFIX = `${adminRoutes.users}/`;

/** A user named by the back office, with their picture, opening their panel while the account exists. */
export function UserLink({ user, fallback, deleted }: { user: AuditUser | null; fallback: string; deleted: string }) {
  if (!user) {
    return <span className="text-muted-foreground">{fallback}</span>;
  }
  if (!user.username) {
    return <span className="text-muted-foreground italic">{deleted}</span>;
  }
  return (
    <PanelLink
      href={adminRoutes.user(user.id)}
      panelPrefix={PANEL_PREFIX}
      className="inline-flex items-center gap-1.5 font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
    >
      <UserAvatar user={{ ...user, username: user.username }} className="size-5" fallbackClassName="text-[9px]" />
      {user.displayName ?? `@${user.username}`}
    </PanelLink>
  );
}
