import type { AdminRole } from "./roles";

/** `GET /api/admin/me`: the signed-in member of the team. */
export interface AdminMeResponse {
  id: string;
  roles: AdminRole[];
}
