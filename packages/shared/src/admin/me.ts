import type { AdminRole } from "./roles";

/** `GET /api/admin/me`: the back-office roles of the signed-in user. */
export interface AdminMeResponse {
  roles: AdminRole[];
}
