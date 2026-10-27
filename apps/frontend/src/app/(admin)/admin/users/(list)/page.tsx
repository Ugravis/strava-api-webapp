import {
  ADMIN_USER_SORTS,
  ADMIN_USER_STATUSES,
  AdminRole,
  type AdminMeResponse,
  type AdminPage,
  type AdminUserSummary,
} from "@kilotrace/shared/admin";
import { PanelLink } from "@/components/admin/panel-link";
import { Pagination } from "@/components/admin/pagination";
import { UserAvatar } from "@/components/user/user-avatar";
import { getAdminMe, requireAdminRole } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { formatDate, formatDateTime, formatRelative } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { actRefusal } from "@/lib/admin/permissions";
import { hrefWith, oneOf, pageOf, param } from "@/lib/admin/url";
import { publicNameOf } from "@/lib/user";
import { UserActions } from "../user-actions";
import { ConnectionIcons, DistinctionIcons, RoleDot, SuspendedBadge } from "../user-bits";

const VIEWS = ["cards", "table"] as const;
const PANEL_PREFIX = `${adminRoutes.users}/`;

/** A page of the accounts, as cards or as a table; one opens in the panel above. */
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdminRole(AdminRole.Support);
  const t = getAdminTranslations("users");
  const common = getAdminTranslations("common");
  const params = await searchParams;

  const q = param(params, "q")?.trim().slice(0, 100) || undefined;
  const status = oneOf(param(params, "status"), ADMIN_USER_STATUSES);
  const sort = oneOf(param(params, "sort"), ADMIN_USER_SORTS);
  const view = oneOf(param(params, "view"), VIEWS);
  const page = pageOf(param(params, "page"));
  const current = {
    q,
    status: status === "all" ? undefined : status,
    sort: sort === "recent" ? undefined : sort,
    view: view === "cards" ? undefined : view,
  };

  const query = new URLSearchParams({ status, sort, page: String(page), ...(q && { q }) });
  const [result, me] = await Promise.all([adminApi<AdminPage<AdminUserSummary>>(`/users?${query}`), getAdminMe()]);
  const list = result.ok ? result.data : { items: [], total: 0, page, pageSize: 1 };
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("count", { count: list.total })}</p>
      {list.items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : view === "cards" ? (
        <UserCards users={list.items} />
      ) : (
        <UserTable users={list.items} me={me} />
      )}
      <Pagination
        page={page}
        pages={pages}
        hrefFor={(each) => hrefWith(adminRoutes.users, current, { page: each > 1 ? String(each) : null })}
        labels={{
          navigation: common("pagination"),
          previous: common("previous"),
          next: common("next"),
          status: common("page", { page, pages }),
        }}
      />
    </div>
  );
}

function UserCards({ users }: { users: AdminUserSummary[] }) {
  const t = getAdminTranslations("users");
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {users.map((user) => (
        <li key={user.id}>
          <PanelLink
            href={adminRoutes.user(user.id)}
            panelPrefix={PANEL_PREFIX}
            aria-label={t("open", { name: publicNameOf(user) })}
            className="flex h-full items-center gap-2.5 rounded-xl border bg-card px-3 py-2 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <UserAvatar user={user} className="size-9" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{publicNameOf(user)}</span>
                <RoleDot roles={user.roles} />
              </span>
              <span className="truncate text-xs text-muted-foreground">
                @{user.username} • {formatDate(user.createdAt)}
              </span>
            </span>
            {user.suspension && <SuspendedBadge />}
          </PanelLink>
        </li>
      ))}
    </ul>
  );
}

function UserTable({ users, me }: { users: AdminUserSummary[]; me: AdminMeResponse | null }) {
  const t = getAdminTranslations("users");
  const never = getAdminTranslations("common")("never");
  const cell = "px-3 py-2 whitespace-nowrap";
  return (
    // Every column stays, the table scrolling sideways on narrow screens.
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[56rem] text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className={`${cell} font-medium`}>{t("columns.user")}</th>
            <th className={`${cell} font-medium`}>{t("columns.createdAt")}</th>
            <th className={`${cell} font-medium`}>{t("columns.lastSeenAt")}</th>
            <th className={`${cell} font-medium`}>{t("columns.connections")}</th>
            <th className={`${cell} font-medium`}>{t("columns.distinctions")}</th>
            <th className={`${cell} font-medium`}>{t("columns.status")}</th>
            <th className={`${cell} text-right font-medium`}>{t("columns.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="relative border-t transition-colors hover:bg-muted/50">
              <td className={cell}>
                {/* The whole row opens the panel, through this stretched link. */}
                <PanelLink
                  href={adminRoutes.user(user.id)}
                  panelPrefix={PANEL_PREFIX}
                  aria-label={t("open", { name: publicNameOf(user) })}
                  className="flex items-center gap-2 after:absolute after:inset-0 focus-visible:outline-none"
                >
                  <UserAvatar user={user} className="size-8" />
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5 font-medium">
                      {publicNameOf(user)}
                      <RoleDot roles={user.roles} />
                    </span>
                    <span className="text-xs text-muted-foreground">@{user.username}</span>
                  </span>
                </PanelLink>
              </td>
              <td className={`${cell} text-muted-foreground`}>{formatDate(user.createdAt)}</td>
              <td className={`${cell} text-muted-foreground`}>
                {user.lastSeenAt ? (
                  <time dateTime={user.lastSeenAt} title={formatDateTime(user.lastSeenAt)}>
                    {formatRelative(user.lastSeenAt)}
                  </time>
                ) : (
                  never
                )}
              </td>
              {/* Above the stretched link, for the names of the icons on hover. */}
              <td className={`${cell} relative z-10`}>
                <ConnectionIcons user={user} />
              </td>
              <td className={`${cell} relative z-10`}>
                <DistinctionIcons user={user} />
              </td>
              <td className={cell}>{user.suspension && <SuspendedBadge />}</td>
              {/* Above the stretched link. */}
              <td className={`${cell} relative z-10`}>
                {me && !actRefusal(me, user) && <UserActions user={user} quick />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
