/** Limits of the fields of a distinction; its id follows `ADMIN_BADGE_SLUG`. */
export const ADMIN_DISTINCTION_ID_MAX_LENGTH = 32;
export const ADMIN_DISTINCTION_NAME_MAX_LENGTH = 40;
export const ADMIN_DISTINCTION_DESCRIPTION_MAX_LENGTH = 300;

/** How a distinction looks, wherever it is shown. */
export interface AdminDistinctionLook {
  id: string;
  name: string;
  icon: string;
  /** `#rrggbb` of the icon, null for the default one. */
  color: string | null;
}

/** `GET /api/admin/distinctions`: a distinction of the catalog, in display order. */
export interface AdminDistinction extends AdminDistinctionLook {
  description: string | null;
  position: number;
  /** Awarded by the code (`team`, `early_member`): editable, never deleted. */
  system: boolean;
  holdersCount: number;
  createdAt: string;
}

/** `PATCH /api/admin/distinctions/:id`: every field but its id. */
export interface UpdateDistinctionRequest {
  name: string;
  description: string | null;
  icon: string;
  color: string | null;
}

/** `POST /api/admin/distinctions`. */
export interface CreateDistinctionRequest extends UpdateDistinctionRequest {
  id: string;
}
