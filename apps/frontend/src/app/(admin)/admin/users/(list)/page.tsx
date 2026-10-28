import {
  ADMIN_USER_SORTS,
  ADMIN_USER_STATUSES,
  type AdminPage,
  type AdminUserSummary,
} from "@kilotrace/shared/admin";
import { SortHeader } from "@/components/admin/list-navigation";
import { PanelLink } from "@/components/admin/panel-link";
import { Pagination } from "@/components/admin/pagination";
import { UserAvatar } from "@/components/user/user-avatar";
import { requireAdminPermission } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { formatDate, formatDateTime, formatRelative } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { hrefWith, oneOf, pageOf, param } from "@/lib/admin/url";
import { publicNameOf } from "@/lib/user";
import { ConnectionIcons, DistinctionIcons, RoleBadge, SuspendedMark } from "../user-bits";

const VIEWS = ["cards", "table"] as const;
const PANEL_PREFIX = `${adminRoutes.users}/`;

/** A page of the accounts, as cards or as a table; one opens in the panel above. */
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdminPermission("users.view");
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
    sort: sort === ADMIN_USER_SORTS[0] ? undefined : sort,
    view: view === "cards" ? undefined : view,
  };

  const query = new URLSearchParams({ status, sort, page: String(page), ...(q && { q }) });
  const result = await adminApi<AdminPage<AdminUserSummary>>(`/users?${query}`);
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
        <UserTable users={list.items} />
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
              {/* The small icons share the line of the name, which gives way to them. */}
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{publicNameOf(user)}</span>
                <RoleBadge roles={user.roles} />
                {user.suspension && <SuspendedMark />}
                <span className="ml-auto flex shrink-0 items-center gap-1 pl-1">
                  <ConnectionIcons user={user} small />
                  <DistinctionIcons user={user} small />
                </span>
              </span>
              <span className="truncate text-xs text-muted-foreground">
                @{user.username} • {formatDate(user.createdAt)}
              </span>
            </span>
          </PanelLink>
        </li>
      ))}
    </ul>
  );
}

function UserTable({ users }: { users: AdminUserSummary[] }) {
  const t = getAdminTranslations("users");
  const never = getAdminTranslations("common")("never");
  const cell = "px-3 py-2 whitespace-nowrap";
  const sort = (label: string, column: "username" | "created" | "last-seen", first: "asc" | "desc") => (
    <SortHeader
      label={label}
      param="sort"
      defaultValue={ADMIN_USER_SORTS[0]}
      asc={`${column}-asc`}
      desc={`${column}-desc`}
      first={first}
      basePath={adminRoutes.users}
    />
  );
  return (
    // Every column stays, the table scrolling sideways on narrow screens.
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[48rem] text-sm">
        <thead className="bg-muted text-left text-xs text-muted-foreground">
          <tr>
            <th className={cell}>{sort(t("columns.user"), "username", "asc")}</th>
            <th className={cell}>{sort(t("columns.createdAt"), "created", "desc")}</th>
            <th className={cell}>{sort(t("columns.lastSeenAt"), "last-seen", "desc")}</th>
            <th className={`${cell} font-medium`}>{t("columns.connections")}</th>
            <th className={`${cell} font-medium`}>{t("columns.distinctions")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="relative border-t transition-colors odd:bg-background even:bg-muted/50 hover:bg-muted">
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
                      <RoleBadge roles={user.roles} />
                      {user.suspension && <SuspendedMark />}
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
