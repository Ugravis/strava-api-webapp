import type { AdminPermission } from "./permissions";
import type { AdminRole } from "./roles";

/** `GET /api/admin/me`: the signed-in member of the team. */
export interface AdminMeResponse {
  id: string;
  roles: AdminRole[];
  /** What the roles grant, to filter the navigation and the actions. */
  permissions: AdminPermission[];
}
