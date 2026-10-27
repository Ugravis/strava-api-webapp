import {
  ADMIN_USER_SORTS,
  ADMIN_USER_STATUSES,
  AdminRole,
  type AdminPage,
  type AdminUserSummary,
} from "@kilotrace/shared/admin";
import { LayoutGridIcon, SearchIcon, TableIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { LinkPills } from "@/components/admin/link-pills";
import { Pagination } from "@/components/admin/pagination";
import { UrlSelect } from "@/components/admin/url-select";
import { UrlSheet } from "@/components/admin/url-sheet";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user/user-avatar";
import { requireAdminRole } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { formatDate, formatDateTime } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { hrefWith, oneOf, pageOf, param } from "@/lib/admin/url";
import { publicNameOf } from "@/lib/user";
import { UserBadges } from "./user-badges";
import { UserPanel, UserPanelSkeleton } from "./user-panel";

const VIEWS = ["cards", "table"] as const;

/**
 * Accounts, as cards or as a table, filtered and paginated in the URL; one
 * opens in a side panel through `?user=`, with its actions.
 */
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
  const selected = param(params, "user");
  // Defaults are left out of the URLs.
  const current = {
    q,
    status: status === "all" ? undefined : status,
    sort: sort === "recent" ? undefined : sort,
    view: view === "cards" ? undefined : view,
    page: page > 1 ? String(page) : undefined,
  };
  const href = (changes: Record<string, string | null>) => hrefWith(adminRoutes.users, current, changes);

  const query = new URLSearchParams({ status, sort, page: String(page), ...(q && { q }) });
  const result = await adminApi<AdminPage<AdminUserSummary>>(`/users?${query}`);
  const list = result.ok ? result.data : { items: [], total: 0, page, pageSize: 1 };
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <>
      <PageHeader title={t("title")} description={t("description", { count: list.total })} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* A plain GET form: the filters and the view are kept, the page restarts. */}
        <form action={adminRoutes.users} className="flex w-full gap-2 lg:max-w-sm" role="search">
          {current.status && <input type="hidden" name="status" value={current.status} />}
          {current.sort && <input type="hidden" name="sort" value={current.sort} />}
          {current.view && <input type="hidden" name="view" value={current.view} />}
          <Input name="q" type="search" defaultValue={q} placeholder={t("search")} aria-label={t("search")} />
          <Button type="submit" variant="outline" size="icon" aria-label={t("searchSubmit")}>
            <SearchIcon />
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <LinkPills
            label={t("status.label")}
            items={ADMIN_USER_STATUSES.map((each) => ({
              key: each,
              label: t(`status.${each}`),
              href: href({ status: each === "all" ? null : each, page: null }),
              active: each === status,
            }))}
          />
          <UrlSelect
            label={t("sort.label")}
            value={sort}
            options={ADMIN_USER_SORTS.map((each) => ({
              value: each,
              label: t(`sort.${each}`),
              href: href({ sort: each === "recent" ? null : each, page: null }),
            }))}
          />
          <LinkPills
            label={t("view.label")}
            items={[
              { key: "cards", label: t("view.cards"), href: href({ view: null }), active: view === "cards", icon: <LayoutGridIcon /> },
              { key: "table", label: t("view.table"), href: href({ view: "table" }), active: view === "table", icon: <TableIcon /> },
            ]}
          />
        </div>
      </div>

      {list.items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : view === "cards" ? (
        <UserCards users={list.items} hrefFor={(id) => href({ user: id })} />
      ) : (
        <UserTable users={list.items} hrefFor={(id) => href({ user: id })} />
      )}

      <Pagination
        page={page}
        pages={pages}
        hrefFor={(each) => href({ page: each > 1 ? String(each) : null })}
        labels={{
          navigation: common("pagination"),
          previous: common("previous"),
          next: common("next"),
          status: common("page", { page, pages }),
        }}
      />

      {selected && (
        <UrlSheet key={selected} closeHref={href({})}>
          <Suspense fallback={<UserPanelSkeleton />}>
            <UserPanel id={selected} />
          </Suspense>
        </UrlSheet>
      )}
    </>
  );
}

interface UserListProps {
  users: AdminUserSummary[];
  hrefFor: (id: string) => string;
}

function UserCards({ users, hrefFor }: UserListProps) {
  const t = getAdminTranslations("users");
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {users.map((user) => (
        <li key={user.id}>
          <Link
            href={hrefFor(user.id)}
            scroll={false}
            aria-label={t("open", { name: publicNameOf(user) })}
            className="flex h-full items-start gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <UserAvatar user={user} className="size-10" />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate font-medium">{publicNameOf(user)}</span>
              <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
              <span className="truncate text-xs text-muted-foreground">{t("joined", { date: formatDate(user.createdAt) })}</span>
              <UserBadges user={user} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function UserTable({ users, hrefFor }: UserListProps) {
  const t = getAdminTranslations("users");
  const common = getAdminTranslations("common");
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">{t("columns.user")}</th>
            <th className="hidden px-3 py-2 font-medium md:table-cell">{t("columns.email")}</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">{t("columns.createdAt")}</th>
            <th className="hidden px-3 py-2 font-medium lg:table-cell">{t("columns.lastSeenAt")}</th>
            <th className="px-3 py-2 font-medium">{t("columns.status")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="relative border-t transition-colors hover:bg-muted/50">
              <td className="px-3 py-2">
                {/* The whole row opens the panel, through this stretched link. */}
                <Link
                  href={hrefFor(user.id)}
                  scroll={false}
                  aria-label={t("open", { name: publicNameOf(user) })}
                  className="flex items-center gap-2 after:absolute after:inset-0 focus-visible:outline-none"
                >
                  <UserAvatar user={user} className="size-8" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{publicNameOf(user)}</span>
                    <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
                  </span>
                </Link>
              </td>
              <td className="hidden max-w-56 truncate px-3 py-2 text-muted-foreground md:table-cell">{user.email}</td>
              <td className="hidden px-3 py-2 whitespace-nowrap text-muted-foreground sm:table-cell">{formatDate(user.createdAt)}</td>
              <td className="hidden px-3 py-2 whitespace-nowrap text-muted-foreground lg:table-cell">
                {user.lastSeenAt ? formatDateTime(user.lastSeenAt) : common("never")}
              </td>
              <td className="px-3 py-2">
                <UserBadges user={user} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
