import type { AdminRole } from "./roles";

/** `GET /admin/me`: the signed-in back-office user. */
export interface AdminMe {
  id: string;
  email: string;
  role: AdminRole;
}
