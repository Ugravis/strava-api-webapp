/** Limits of the fields of a user tag; its id follows `ADMIN_BADGE_SLUG`. */
export const ADMIN_USER_TAG_ID_MAX_LENGTH = 32;
export const ADMIN_USER_TAG_NAME_MAX_LENGTH = 40;
export const ADMIN_USER_TAG_DESCRIPTION_MAX_LENGTH = 300;

/** How a user tag looks, wherever it is shown. */
export interface AdminUserTagLook {
  id: string;
  name: string;
  icon: string;
  /** `#rrggbb` of the icon, null for the default one. */
  color: string | null;
}

/** `GET /api/admin/user-tags`: a user tag of the catalog, in display order. */
export interface AdminUserTag extends AdminUserTagLook {
  description: string | null;
  position: number;
  /** Awarded by the code (`team`, `early_member`): editable, never deleted. */
  system: boolean;
  holdersCount: number;
  createdAt: string;
}

/** `PATCH /api/admin/user-tags/:id`: every field but its id. */
export interface UpdateUserTagRequest {
  name: string;
  description: string | null;
  icon: string;
  color: string | null;
}

/** `POST /api/admin/user-tags`. */
export interface CreateUserTagRequest extends UpdateUserTagRequest {
  id: string;
}
