import type { AdminRole } from "./roles";

/** `GET /api/admin/team`: a member of the team, highest role first. */
export interface AdminTeamMember {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
  role: AdminRole;
  /** Latest request of any session, null without one. */
  lastSeenAt: string | null;
}

/** `GET /api/admin/team/candidates?q=`: an account outside the team. */
export interface AdminTeamCandidate {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
}

/** Most candidates returned by a search. */
export const ADMIN_TEAM_CANDIDATES_LIMIT = 8;

/** `PUT /api/admin/team/:id`: adds the account to the team, or changes its role. */
export interface SetTeamRoleRequest {
  role: AdminRole;
}
